import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST = "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";

/**
 * Update 41: once a week, refreshes the temporary-inbox domains from the maintained open-source list, and deletes
 * sign-up logs older than 90 days (PIPEDA), decided held items older than a year and old link checks.
 * Run it with: Authorization: Bearer <CRON_SECRET> (a server setting).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const out = { domains: 0, listError: "", skipped: false };
  // the schedule calls every 10 minutes; the list is fetched once a week
  const { data: cfg } = await db.from("safety_config").select("list_at").eq("id", 1).maybeSingle();
  const last = (cfg as { list_at?: string | null } | null)?.list_at;
  if (last && Date.now() - new Date(last).getTime() < 7 * 864e5) out.skipped = true;
  else try {
    const r = await fetch(LIST, { signal: AbortSignal.timeout(15000), cache: "no-store" });
    if (!r.ok) throw new Error(`list ${r.status}`);
    const domains = [...new Set((await r.text()).split("\n").map((l) => l.trim().toLowerCase()).filter((d) => /^[a-z0-9.-]{3,253}$/.test(d) && d.includes(".")))];
    for (let i = 0; i < domains.length; i += 1000) {
      const { error } = await db.from("disposable_domains").upsert(domains.slice(i, i + 1000).map((domain) => ({ domain })), { onConflict: "domain", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    out.domains = domains.length;
    await db.from("safety_config").update({ list_at: new Date().toISOString() }).eq("id", 1);
  } catch (e) {
    out.listError = (e as Error).message;
  }
  const now = Date.now();
  await Promise.all([
    db.from("signup_log").delete().lt("at", new Date(now - 90 * 864e5).toISOString()),
    db.from("held_items").delete().lt("decided_at", new Date(now - 365 * 864e5).toISOString()),
    db.from("link_cache").delete().lt("checked_at", new Date(now - 8 * 864e5).toISOString()),
  ]);
  return NextResponse.json(out);
}
