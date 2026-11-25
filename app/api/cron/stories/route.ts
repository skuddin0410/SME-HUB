import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stories settings, "After a story leaves the feed: Permanently delete its photos and videos".
 * When that switch is on, deletes the files of stories that have left the feed and are in no highlight.
 * Run it every hour with: Authorization: Bearer <CRON_SECRET> (a server setting). With the switch off it does nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const { data, error } = await db.rpc("story_purge_expired");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const paths = ((data ?? []) as { path: string }[]).map((r) => r.path).filter((p) => p && !p.startsWith("sample/"));
  let deleted = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const { data: gone } = await db.storage.from("stories").remove(paths.slice(i, i + 100));
    deleted += gone?.length ?? 0;
  }
  return NextResponse.json({ files: paths.length, deleted });
}
