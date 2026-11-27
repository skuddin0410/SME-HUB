import { serviceClient } from "@/lib/supabase/service";
import { DEFAULT_REM, deadlinesIcs, dlGen, dxStart, torontoToday, type DlCustom, type DlRem, type DlSetup } from "@/lib/deadlines";
import { siteUrl } from "@/lib/courses-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update 38: a member's deadlines as a calendar that updates itself (webcal://<site>/deadlines/<token>.ics).
 * The token is long and random; the member can reset it in My deadlines if the link gets shared.
 * Dates already ticked off are left out.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^([A-Za-z0-9_-]{40,64})\.ics$/.exec(file);
  const nope = new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!m) return nope;
  const db = serviceClient();
  if (!db) return nope;
  const { data } = await db.from("deadline_settings").select("user_id, setup, done, rem").eq("feed_token", m[1]).maybeSingle();
  const row = data as { user_id: string; setup: DlSetup | null; done: Record<string, boolean>; rem: Partial<DlRem> } | null;
  if (!row) return nope;
  const { data: c } = await db.from("deadline_custom").select("id, title, due, rep, note").eq("user_id", row.user_id).order("due");
  const today = torontoToday();
  const list = dlGen(row.setup, (c ?? []) as DlCustom[], today, dxStart(today, row.setup?.at)).filter((o) => !row.done?.[o.key]);
  return new Response(deadlinesIcs(list, { ...DEFAULT_REM, ...(row.rem ?? {}) }, siteUrl()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="my-deadlines.ics"', "Cache-Control": "private, max-age=900", "X-Robots-Tag": "noindex" },
  });
}
