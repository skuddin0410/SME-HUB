"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload } from "tus-js-client";

/**
 * Photos go from the browser straight to storage, shrunk first.
 * They used to travel inside the form to our own server, and a normal phone photo (several MB)
 * was more than the hosting layer accepts in one request, so the whole save failed.
 */
const SETTINGS = {
  avatar: { side: 512, type: "image/jpeg" },
  post: { side: 2000, type: "image/jpeg" }, // Update 10: photos in posts up to 2000 px; re-drawing them drops location data (EXIF)
  cover: { side: 1600, type: "image/jpeg" },
  header: { side: 2400, type: "image/jpeg" }, // Update 39: the original header photo, kept so the member can re-crop it
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

/** Uploads a picture already drawn in the browser (for example the 1584 x 396 header crop) to the member's folder. */
export async function uploadBlob(blob: Blob, prefix: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in again to upload a picture.");
  const path = `${userId}/${prefix}-${crypto.randomUUID()}.${blob.type === "image/png" ? "png" : "jpg"}`;
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

/** Update 10: the limits for a post's photos and video. */
export const POST_MEDIA = { photos: 10, photoMB: 10, videoMB: 500, videoMinutes: 10 } as const;

/** Reads a video's length in the browser (the server has no video tools), and a still from it for the poster. */
export function readVideo(file: File): Promise<{ seconds: number; poster: Blob | null }> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const src = URL.createObjectURL(file);
    let done = false;
    const finish = (seconds: number, poster: Blob | null) => { if (done) return; done = true; URL.revokeObjectURL(src); resolve({ seconds, poster }); };
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 0) / 2); };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight, 1));
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(v.videoWidth * scale));
        c.height = Math.max(1, Math.round(v.videoHeight * scale));
        c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => finish(v.duration, b), "image/jpeg", 0.82);
      } catch {
        finish(v.duration, null);
      }
    };
    v.onerror = () => finish(Number.NaN, null);
    setTimeout(() => finish(v.duration || Number.NaN, null), 15000);
    v.src = src;
  });
}

/**
 * Uploads a post's video in 6 MB pieces that pick up where they stopped (resumable upload),
 * to the member's own folder in the post-videos bucket. Returns its public address.
 */
export async function uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const ext = /\.mov$/i.test(file.name) || file.type === "video/quicktime" ? "mov" : "mp4";
  if (!/^video\/(mp4|quicktime)$/.test(file.type) && !/\.(mp4|mov)$/i.test(file.name)) throw new Error("Choose an MP4 or MOV video.");
  if (file.size > POST_MEDIA.videoMB * 1024 * 1024) throw new Error(`Videos can be up to ${POST_MEDIA.videoMB} MB and ${POST_MEDIA.videoMinutes} minutes long`);
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Sign in again to upload a video.");
  const name = `${session.user.id}/video-${crypto.randomUUID()}.${ext}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  await new Promise<void>((resolve, reject) => {
    const up = new Upload(file, {
      endpoint: `${base}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // the size Supabase expects for each piece
      metadata: { bucketName: "post-videos", objectName: name, contentType: ext === "mov" ? "video/quicktime" : "video/mp4", cacheControl: "31536000" },
      onError: () => reject(new Error("The video did not upload. Check your connection and try again.")),
      onProgress: (sent, total) => onProgress?.(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    up.start();
  });
  return `${base}/storage/v1/object/public/post-videos/${name}`;
}

/** Update 26: one PDF per post, up to 25 MB, kept in the private post-pdfs bucket. */
export const POST_PDF_MB = 25;

export function pdfSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Checks a file is a real PDF (by its first bytes, not its name) and uploads it to the member's own folder. */
export async function uploadPdf(file: File): Promise<{ path: string; name: string; size: number }> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf = String.fromCharCode(...head) === "%PDF-";
  if (!isPdf) throw new Error("That file isn’t a PDF. Choose a .pdf file.");
  if (file.size > POST_PDF_MB * 1024 * 1024) throw new Error(`PDFs can be up to ${POST_PDF_MB} MB. This one is ${pdfSize(file.size)}.`);
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Sign in again to upload a PDF.");
  const path = `${userId}/pdf-${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("post-pdfs").upload(path, file, { contentType: "application/pdf", cacheControl: "3600" });
  if (error) throw new Error(/bucket not found/i.test(error.message) ? "PDFs can’t be added yet. Try again later." : `Upload failed: ${error.message}`);
  let name = file.name.trim().replace(/[\u0000-\u001f\\/]/g, "") || "document.pdf";
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  if (name.length > 200) name = name.slice(0, 196) + ".pdf";
  return { path, name, size: file.size };
}
