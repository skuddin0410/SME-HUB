"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Photos go from the browser straight to storage, shrunk first.
 * They used to travel inside the form to our own server, and a normal phone photo (several MB)
 * was more than the hosting layer accepts in one request, so the whole save failed.
 */
const SETTINGS = {
  avatar: { side: 512, type: "image/jpeg" },
  post: { side: 1600, type: "image/jpeg" },
  logo: { side: 512, type: "image/png" }, // PNG keeps a logo's transparent background
} as const;
export type ImageKind = keyof typeof SETTINGS;

async function shrink(file: File, kind: ImageKind): Promise<Blob> {
  const { side, type } = SETTINGS[kind];
  // respects the rotation phones store in the photo
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  if (type === "image/jpeg") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), type, 0.86));
}

/** Shrinks and uploads one picture to the signed-in member's folder; returns its public address. */
export async function uploadImage(file: File, kind: ImageKind): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > 25 * 1024 * 1024) throw new Error("That picture is too large. Choose one under 25 MB.");
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in again to upload a picture.");

  let blob: Blob;
  try {
    blob = await shrink(file, kind);
  } catch {
    throw new Error("We could not read that picture. Try a JPG or PNG.");
  }
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${blob.type === "image/png" ? "png" : "jpg"}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** State for one picture field: what to show, the uploaded address to submit, and whether it is still uploading. */
export function useImageUpload(kind: ImageKind, initial: string | null = null) {
  const [preview, setPreview] = useState<string | null>(initial);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      setUrl(await uploadImage(file, kind));
    } catch (e) {
      setPreview(initial);
      setUrl("");
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const clear = useCallback(() => {
    setPreview(null);
    setUrl("");
    setError(null);
  }, []);
  return { preview, url, busy, error, pick, clear };
}
