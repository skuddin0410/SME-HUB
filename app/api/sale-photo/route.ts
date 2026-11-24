import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { FS_MAX_PHOTO } from "@/lib/forsale-shared";

export const runtime = "nodejs";

/**
 * A listing photo (Update 5): up to 8 MB, turned the right way up, resized to 1600 px wide and saved as a JPEG.
 * Re-encoding drops the location and camera data (EXIF), so a seller's address can't leak from the picture.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub as string | undefined;
  if (!uid) return NextResponse.json({ error: "Sign in again to upload a photo." }, { status: 401 });
  const [{ data: can }, { count }] = await Promise.all([
    supabase.rpc("sale_can_list"),
    supabase.from("sale_listings").select("id", { count: "exact", head: true }).eq("seller_id", uid),
  ]);
  if (!can && !count) return NextResponse.json({ error: "Selling a business is for Plus members and Advisors." }, { status: 403 });
  let file: File | null = null;
  try {
    const f = (await req.formData()).get("file");
    file = f instanceof File ? f : null;
  } catch {}
  if (!file) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });
  if (file.size > FS_MAX_PHOTO) return NextResponse.json({ error: "That photo is over 8 MB. Choose a smaller one." }, { status: 413 });
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "That file is not a photo we can read." }, { status: 400 });
  }
  const path = `${uid}/forsale-${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("media").upload(path, out, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  return NextResponse.json({ url: supabase.storage.from("media").getPublicUrl(path).data.publicUrl });
}
