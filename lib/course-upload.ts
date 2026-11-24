"use client";

import { createClient } from "@/lib/supabase/client";

const safe = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";

/** A course cover: cropped to fill 1280 × 640 (as the hand-off's editor does), then saved in the member's own picture folder. */
export async function uploadCover(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Sign in again to upload a picture.");
  let blob: Blob;
  try {
    const bm = await createImageBitmap(file, { imageOrientation: "from-image" });
    const cv = document.createElement("canvas");
    cv.width = 1280;
    cv.height = 640;
    const x = cv.getContext("2d")!;
    const s = Math.max(1280 / bm.width, 640 / bm.height);
    x.fillStyle = "#fff";
    x.fillRect(0, 0, 1280, 640);
    x.drawImage(bm, (1280 - bm.width * s) / 2, (640 - bm.height * s) / 2, bm.width * s, bm.height * s);
    bm.close();
    blob = await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/jpeg", 0.82));
  } catch {
    throw new Error("That image could not be read");
  }
  const path = `${uid}/course-cover-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** A private course file (lesson video, captions, download, or a learner's work). The database checks the folder. */
export async function uploadPrivate(folder: string, file: File): Promise<string> {
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID().slice(0, 8)}-${safe(file.name)}`;
  const type = file.name.toLowerCase().endsWith(".vtt") ? "text/vtt" : file.type || "application/octet-stream";
  const { error } = await supabase.storage.from("course-files").upload(path, file, { contentType: type, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function myId() {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? null;
}
