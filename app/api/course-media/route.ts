import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".vtt": "text/vtt; charset=utf-8", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".pdf": "application/pdf" };
// the hand-off's sample media, kept outside public/ so every request goes through the checks below
const SAMPLE_DIR = path.join(process.cwd(), "content", "course-media");
const notFound = () => NextResponse.json({ error: "This file isn’t available" }, { status: 404 });

function sample(rel: string, req: Request, download?: string) {
  const name = path.basename(rel.replace(/^sample\//, ""));
  const file = path.join(SAMPLE_DIR, name);
  if (!file.startsWith(SAMPLE_DIR + path.sep)) return notFound();
  let st;
  try {
    st = statSync(file);
  } catch {
    return notFound();
  }
  const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
  const head: Record<string, string> = {
    "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    "Content-Disposition": download ? `attachment; filename="${download.replace(/["\\\r\n]/g, "")}"` : "inline",
  };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const start = range[1] ? +range[1] : Math.max(0, st.size - +range[2]);
    const end = range[1] && range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${st.size}` } });
    const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new NextResponse(body, { status: 206, headers: { ...head, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": String(end - start + 1) } });
  }
  return new NextResponse(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: { ...head, "Content-Length": String(st.size) } });
}

/**
 * Lesson videos, captions, downloads and learners' files. The database decides on every request whether the
 * viewer may have it (free preview, enrolment, order, drip, course team); locked items are never served by URL.
 * Uploaded files are handed over as a short-lived signed link; the hand-off's sample media is streamed from the server.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const supabase = await createClient();
  const lesson = u.searchParams.get("l");
  const kind = u.searchParams.get("k");
  const fileId = u.searchParams.get("f");
  const course = u.searchParams.get("c");
  const sub = u.searchParams.get("s");
  let p = "";
  let download: string | undefined;

  if (lesson && UUID.test(lesson) && (kind === "video" || kind === "captions")) {
    // the row is only returned to someone who may open the lesson
    const { data } = await supabase.from("lesson_content").select("video_path, captions_path").eq("lesson_id", lesson).maybeSingle();
    p = (kind === "video" ? data?.video_path : data?.captions_path) ?? "";
  } else if (fileId && UUID.test(fileId)) {
    const { data } = await supabase.from("lesson_files").select("lesson_id, name, path").eq("id", fileId).maybeSingle();
    if (!data) return notFound();
    const { data: ok } = await supabase.rpc("lesson_download_ok", { p_lesson: data.lesson_id });
    if (!ok) return NextResponse.json({ error: "Enrol to download this file" }, { status: 403 });
    p = data.path as string;
    download = data.name as string;
  } else if (course && UUID.test(course) && (kind === "pvideo" || kind === "pcaptions")) {
    const { data } = await supabase.from("courses").select("preview_video, preview_captions").eq("id", course).maybeSingle();
    p = (kind === "pvideo" ? data?.preview_video : data?.preview_captions) ?? "";
  } else if (sub && UUID.test(sub)) {
    const { data } = await supabase.from("submissions").select("file_path, file_name").eq("id", sub).maybeSingle();
    p = (data?.file_path as string) ?? "";
    download = (data?.file_name as string) || "submission";
  }
  if (!p) return notFound();
  if (p.startsWith("sample/")) return sample(p, req, download);
  const { data: signed } = await supabase.storage.from("course-files").createSignedUrl(p, 60, download ? { download } : undefined);
  if (!signed?.signedUrl) return notFound();
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
