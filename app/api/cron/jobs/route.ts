import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { mail, people } from "@/lib/apps/mail";
import { siteUrl } from "@/lib/courses-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update 43: jobs close by themselves 30 days after they're posted (the database hides them). This sends the poster
 * a reminder 3 days before, once. Run it with: Authorization: Bearer <CRON_SECRET> (a server setting).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const now = Date.now();
  const { data, error } = await db
    .from("jobs")
    .select("id, title, posted_by, closes_at, views")
    .eq("status", "open")
    .is("reminded_at", null)
    .gt("closes_at", new Date(now).toISOString())
    .lte("closes_at", new Date(now + 3 * 864e5).toISOString())
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as { id: string; title: string; posted_by: string; closes_at: string; views: number }[];
  const who = await people(rows.map((r) => r.posted_by));
  const site = siteUrl();
  let sent = 0;
  for (const j of rows) {
    // mark first, so a second run can never send it twice
    const { data: claimed } = await db.from("jobs").update({ reminded_at: new Date().toISOString() }).eq("id", j.id).is("reminded_at", null).select("id").maybeSingle();
    if (!claimed) continue;
    const { count } = await db.from("job_applications").select("id", { count: "exact", head: true }).eq("job_id", j.id);
    const ok = await mail("job-closing-soon", who.get(j.posted_by), {
      job_title: j.title,
      close_date: new Date(j.closes_at).toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "America/Toronto" }),
      apps: String(count ?? 0), views: String(j.views ?? 0), mine_url: `${site}/jobs/mine`, post_url: `${site}/jobs/post`,
    }, { once: `job-closing-${j.id}` });
    if (ok) sent += 1;
  }
  return NextResponse.json({ checked: rows.length, sent });
}
