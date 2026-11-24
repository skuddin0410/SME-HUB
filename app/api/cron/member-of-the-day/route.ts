import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { courseMail, memberEmail, siteUrl } from "@/lib/courses-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update 11: once a day, settles today's Member of the Day and emails them ("You're today's Member of the Day"),
 * so they can share it. Run it each morning with: Authorization: Bearer <CRON_SECRET> (a server setting). Sent once per day.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const { data: m } = await db.rpc("member_of_the_day");
  const motd = m as { id: string; day: string } | null;
  if (!motd) return NextResponse.json({ sent: 0, note: "No member is ready to be featured yet" });
  const { data: claimed } = await db.rpc("motd_claim_email", { p_day: motd.day });
  if (!claimed) return NextResponse.json({ sent: 0, note: "Already emailed today" });
  const site = siteUrl();
  const date = new Date(`${motd.day}T12:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  await courseMail("member-of-the-day", await memberEmail(motd.id), { motd_date: date, profile_url: `${site}/members/${motd.id}`, spotlight_url: `${site}/spotlight` }, `motd-${motd.day}`);
  return NextResponse.json({ sent: 1 });
}
