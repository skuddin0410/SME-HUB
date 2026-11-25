"use client";

import { Upload } from "tus-js-client";
import { createClient } from "@/lib/supabase/client";
import { STTYPES } from "@/lib/stories-shared";

/**
 * Sends one story photo or video to the member's own folder in the private stories bucket, in resumable
 * 6 MB pieces, reporting progress. Returns the stored path (the story itself is created afterwards).
 */
export async function uploadStoryFile(file: Blob, ext: string, onProgress?: (pct: number) => void): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error("Sign in again to upload.");
  const name = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  await new Promise<void>((resolve, reject) => {
    const up = new Upload(file, {
      endpoint: `${base}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${session.access_token}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: "stories", objectName: name, contentType: STTYPES[ext]?.[0] ?? "application/octet-stream", cacheControl: "3600" },
      onError: () => reject(new Error("Upload failed. Check your connection and try again. Your caption is saved.")),
      onProgress: (sent, total) => onProgress?.(total ? Math.round((sent / total) * 100) : 0),
      onSuccess: () => resolve(),
    });
    up.start();
  });
  return name;
}
