import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { courseMail, memberEmail, siteUrl } from "@/lib/courses-mail";
import { DEFAULT_REM, dLong, daysUntil, dlGen, dlWhen, torontoToday, type DlCustom, type DlItem, type DlRem, type DlSetup } from "@/lib/deadlines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const where = (d: DlItem, s: DlSetup | null) =>
  d.cat === "own" ? "Your own records" : d.cat === "tax" && s?.prov === "QC" ? "Revenu Québec, My Account for businesses" : "CRA My Business Account";

/**
 * Update 13: once a day, reminds members of their deadlines 14, 7 and/or 1 day before (as each member chose),
 * with a bell notification and/or the "deadline-reminder" email. Each reminder is sent once (deadline_sent).
 * Run it each morning with: Authorization: Bearer <CRON_SECRET> (a server setting).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });

  const today = torontoToday();
  const [{ data: sets }, { data: own }] = await Promise.all([
    db.from("deadline_settings").select("user_id, setup, done, rem").limit(5000),
    db.from("deadline_custom").select("id, user_id, title, due, rep, note").limit(20000),
  ]);
  type Row = { user_id: string; setup: DlSetup | null; done: Record<string, boolean>; rem: Partial<DlRem> };
  const users = new Map<string, Row>();
  for (const s of (sets ?? []) as Row[]) users.set(s.user_id, s);
  const mine = new Map<string, DlCustom[]>();
  for (const c of (own ?? []) as (DlCustom & { user_id: string })[]) {
    if (!users.has(c.user_id)) users.set(c.user_id, { user_id: c.user_id, setup: null, done: {}, rem: {} });
    mine.set(c.user_id, [...(mine.get(c.user_id) ?? []), c]);
  }

  const site = siteUrl();
  let bells = 0, emails = 0;
  for (const u of users.values()) {
    const rem = { ...DEFAULT_REM, ...(u.rem ?? {}) };
    if (!rem.email && !rem.bell) continue;
    const leads = [rem.d14 && 14, rem.d7 && 7, rem.d1 && 1].filter(Boolean) as number[];
    const due = dlGen(u.setup ?? null, mine.get(u.user_id) ?? [], today).filter((d) => !u.done?.[d.key] && leads.includes(daysUntil(d.iso, today)));
    for (const d of due) {
      const lead = daysUntil(d.iso, today);
      // claim it first, so two runs never send the same reminder twice
      const { data: claimed } = await db.from("deadline_sent").upsert({ user_id: u.user_id, key: d.key, lead }, { onConflict: "user_id,key,lead", ignoreDuplicates: true }).select("lead");
      if (!claimed?.length) continue;
      const when = dlWhen(d.iso, today).toLowerCase();
      if (rem.bell) {
        await db.from("notifications").insert({ user_id: u.user_id, actor_id: u.user_id, type: "deadline", href: "/deadlines", note: `${d.t} is due ${when}`.slice(0, 200) });
        bells++;
      }
      if (rem.email) {
        await courseMail(
          "deadline-reminder",
          await memberEmail(u.user_id),
          {
            dl_title: d.t,
            dl_when: when,
            dl_date: dLong(d.iso),
            dl_detail: d.dt,
            dl_where: where(d, u.setup),
            dl_url: `${site}/deadlines`,
            dl_done_url: `${site}/deadlines`,
            dl_settings_url: `${site}/deadlines#reminders`,
            reason: "you turned on deadline reminders in My deadlines",
          },
          `deadline-${u.user_id}-${d.key}-${lead}`,
        );
        emails++;
      }
    }
    // Update 38: once, the day after a date passes without being ticked off, "Did you file this?"
    const y = new Date(`${today}T00:00:00Z`); y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    if (!u.setup?.at || u.setup.at <= yesterday) {
      const late = dlGen(u.setup ?? null, mine.get(u.user_id) ?? [], today, yesterday).filter((d) => d.iso === yesterday && !u.done?.[d.key]);
      for (const d of late) {
        const { data: claimed } = await db.from("deadline_sent").upsert({ user_id: u.user_id, key: d.key, lead: -1 }, { onConflict: "user_id,key,lead", ignoreDuplicates: true }).select("lead");
        if (!claimed?.length) continue;
        if (rem.bell) {
          await db.from("notifications").insert({ user_id: u.user_id, actor_id: u.user_id, type: "deadline", href: "/deadlines", note: `Did you file this? ${d.t} was due yesterday`.slice(0, 200) });
          bells++;
        }
        if (rem.email) {
          await courseMail("deadline-overdue", await memberEmail(u.user_id), {
            dl_title: d.t, dl_date: dLong(d.iso), dl_where: where(d, u.setup), dl_url: `${site}/deadlines`, dl_settings_url: `${site}/deadlines#reminders`,
          }, `deadline-${u.user_id}-${d.key}-late`);
          emails++;
        }
      }
    }
  }
  return NextResponse.json({ members: users.size, bells, emails });
}
