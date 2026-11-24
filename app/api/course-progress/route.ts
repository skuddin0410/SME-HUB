import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Saves where a learner stopped a video, sent as the page closes (the browser's beacon), against their account. */
export async function POST(req: Request) {
  let body: { l?: string; s?: number } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.l || !UUID.test(body.l) || !Number.isFinite(body.s)) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = await createClient();
  await supabase.rpc("save_video_pos", { p_lesson: body.l, p_sec: Math.max(0, Math.round(body.s! * 10) / 10) });
  return NextResponse.json({ ok: true });
}
