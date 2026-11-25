import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" };
// the hand-off's sample story media, kept outside public/ so it goes through the same checks
const SAMPLE_DIR = path.join(process.cwd(), "content", "story-media");
const notFound = () => NextResponse.json({ error: "This story isn’t available" }, { status: 404 });

function sample(rel: string, req: Request) {
  const name = path.basename(rel.replace(/^sample\//, ""));
  const file = path.join(SAMPLE_DIR, name);
  if (!file.startsWith(SAMPLE_DIR + path.sep)) return notFound();
  let st;
  try {
    st = statSync(file);
  } catch {
    return notFound();
  }
  const head: Record<string, string> = { "Content-Type": TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? +range[1] : Math.max(0, st.size - +range[2]);
    const end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
    return new NextResponse(Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream, { status: 206, headers: { ...head, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": String(end - start + 1) } });
  }
  return new NextResponse(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...head, "Content-Length": String(st.size) } });
}

/**
 * A story's photo, video or video poster. The database returns the item only to someone allowed to see it
 * (audience, approval, removal, blocks), so a story's file is never reachable by guessing its address.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const poster = new URL(req.url).searchParams.get("poster") === "1";
  const supabase = await createClient();
  const { data } = await supabase.from("story_items").select("path, poster_path").eq("id", id).maybeSingle();
  const p = ((poster ? data?.poster_path : data?.path) as string | null | undefined) ?? "";
  if (!p) return notFound();
  if (p.startsWith("sample/")) return sample(p, req);
  const { data: signed } = await supabase.storage.from("stories").createSignedUrl(p, 300);
  if (!signed?.signedUrl) return notFound();
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
