import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { siteUrl } from "@/lib/courses-mail";
import { EV_SELECT, evDateBlock, evHostOf, evWhen, evWhere, type Ev } from "@/lib/events";
import { callSpan, callWhen, torontoDayKey } from "@/lib/consult";
import { mail, people } from "@/lib/apps/mail";
import { personalLink } from "@/lib/apps/event-zoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Update 36: the emails that go out on a schedule. Called every 10 minutes (pg_cron, see migration 0074) with
 * Authorization: Bearer <CRON_SECRET>. Each email goes once (mail_sent), so running it twice is safe.
 *  1. Event reminders by email: a week, a day and an hour before, as each member chose (the bell already does this).
 *  2. Free consultation reminders to both people, a day and an hour before.
 *  3. Hosts who chose "Daily summary": yesterday's registrations, once a day after 8 am Toronto time.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  const site = siteUrl();
  const now = Date.now();
  const H = 3600_000;
  let sent = 0;

  // ---------- 1. event reminders ----------
  const { data: evs } = await db.from("hub_events").select(`${EV_SELECT}, join_mode`).eq("status", "published").is("cancelled_at", null)
    .gt("starts_at", new Date(now).toISOString()).lt("starts_at", new Date(now + 8 * 86400_000).toISOString()).limit(200);
  for (const e of (evs ?? []) as (Ev & { join_mode?: string })[]) {
    const left = Date.parse(e.starts_at!) - now;
    const kind = left <= H ? "hour" : left <= 24 * H ? "day" : left <= 7 * 24 * H ? "week" : null;
    if (!kind) continue;
    const [{ data: saves }, { data: rems }, { data: regs }] = await Promise.all([
      db.from("event_saves").select("user_id").eq("event_id", e.id).limit(3000),
      db.from("event_reminders").select("user_id, week, day, hour").eq("event_id", e.id).limit(3000),
      db.from("event_rsvps").select("user_id").eq("event_id", e.id).limit(3000),
    ]);
    const rem = new Map(((rems ?? []) as { user_id: string; week: boolean; day: boolean; hour: boolean }[]).map((r) => [r.user_id, r]));
    const going = new Set(((regs ?? []) as { user_id: string }[]).map((r) => r.user_id));
    const want = ((saves ?? []) as { user_id: string }[]).map((s) => s.user_id).filter((u) => (rem.get(u) ?? { week: false, day: true, hour: true })[kind]);
    if (!want.length) continue;
    const { data: off } = await db.from("member_settings").select("member_id").in("member_id", want).eq("alert_events", false);
    const muted = new Set(((off ?? []) as { member_id: string }[]).map((m) => m.member_id));
    const to = want.filter((u) => !muted.has(u));
    if (!to.length) continue;
    const { data: hp } = e.host_id ? await db.from("profiles").select("full_name, avatar_url, headline, location, plan, profile_type").eq("id", e.host_id).maybeSingle() : { data: null };
    const host = evHostOf(e, hp as never).name;
    const ps = await people(to);
    const b = evDateBlock(e);
    for (const u of to) {
      const isGoing = going.has(u);
      const link = isGoing && e.fmt === "online" ? (e.join_mode === "zoom" ? await personalLink(e.id, u) : null) : null;
      const joinUrl = isGoing && e.fmt === "online" ? `${site}/events/${e.slug}/join` : `${site}/events/${e.slug}`;
      const ok = kind === "day"
        ? await mail("event-reminder", ps.get(u), { event_name: e.title, event_when: evWhen(e, true), event_where: evWhere(e), event_host: host, event_day: b?.d ?? "", event_mon: b?.mon ?? "", join_url: link ?? joinUrl }, { once: `evrem:${e.id}:${u}:day` })
        : await mail("event-reminder-soon", ps.get(u), {
            when_rel: kind === "hour" ? "Starting within the hour" : "Next week", event_name: e.title, event_when: evWhen(e, true), event_where: evWhere(e), event_host: host,
            join_url: link ?? joinUrl, button_label: isGoing && e.fmt === "online" ? (kind === "hour" ? "Join on Zoom" : "Open the event") : isGoing ? "Open the event" : "Register",
          }, { once: `evrem:${e.id}:${u}:${kind}` });
      if (ok) sent++;
    }
  }

  // ---------- 2. free consultation reminders ----------
  const { data: calls } = await db.from("consult_bookings").select("id, advisor_id, member_id, starts_at, minutes, topic, join_url, reminded_day, reminded_hour")
    .eq("status", "booked").gt("starts_at", new Date(now).toISOString()).lt("starts_at", new Date(now + 24 * H).toISOString()).limit(500);
  for (const c of (calls ?? []) as { id: string; advisor_id: string; member_id: string; starts_at: string; minutes: number; topic: string; join_url: string | null; reminded_day: string | null; reminded_hour: string | null }[]) {
    const left = Date.parse(c.starts_at) - now;
    const kind = left <= H ? (c.reminded_hour ? null : "hour") : c.reminded_day ? null : "day";
    if (!kind) continue;
    await db.from("consult_bookings").update(kind === "hour" ? { reminded_hour: new Date().toISOString(), reminded_day: c.reminded_day ?? new Date().toISOString() } : { reminded_day: new Date().toISOString() }).eq("id", c.id);
    const ps = await people([c.advisor_id, c.member_id]);
    const adv = ps.get(c.advisor_id), mem = ps.get(c.member_id);
    const rel = kind === "hour" ? "Within the hour" : "Tomorrow";
    const common = { when_rel: rel, when_rel_lower: kind === "hour" ? "within the hour" : "tomorrow", call_when: callWhen(c.starts_at), call_span: callSpan(c.starts_at, c.minutes), call_note: c.topic || "Not added" };
    if (await mail("consult-reminder", mem, { ...common, other_name: adv?.name ?? "your SME Advisor", join_url: c.join_url ?? `${site}/members/${c.advisor_id}#advbook`, button_label: "Join the Zoom meeting" }, { once: `crem:${c.id}:${kind}:m` })) sent++;
    if (await mail("consult-reminder", adv, { ...common, other_name: mem?.name ?? "a member", join_url: `${site}/consult/${c.id}/start`, button_label: "Start the Zoom meeting" }, { once: `crem:${c.id}:${kind}:a` })) sent++;
  }

  // ---------- 3. hosts' daily summary ----------
  const torontoHour = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", hour12: false }).format(new Date(now))) % 24;
  if (torontoHour >= 8) {
    const day = torontoDayKey(now);
    const { data: hosts } = await db.from("consult_settings").select("advisor_id").eq("reg_mail", "daily").limit(2000);
    for (const h of (hosts ?? []) as { advisor_id: string }[]) {
      const { data: mine } = await db.from("hub_events").select("id, title").eq("host_id", h.advisor_id).is("cancelled_at", null).gt("starts_at", new Date(now - 86400_000).toISOString()).limit(100);
      const evMap = new Map(((mine ?? []) as { id: string; title: string }[]).map((x) => [x.id, x.title]));
      if (!evMap.size) continue;
      const { data: regs } = await db.from("event_rsvps").select("event_id, user_id, created_at").in("event_id", [...evMap.keys()]).gt("created_at", new Date(now - 24 * H).toISOString()).limit(1000);
      const list = (regs ?? []) as { event_id: string; user_id: string }[];
      if (!list.length) continue;
      const { data: counts } = await db.rpc("event_going", { p_ids: [...evMap.keys()] });
      const going = new Map(((counts ?? []) as { event_id: string; going: number }[]).map((x) => [x.event_id, x.going]));
      const ps = await people([h.advisor_id, ...list.map((r) => r.user_id)]);
      const items = list.slice(0, 50).map((r) => ({ name: ps.get(r.user_id)?.name ?? "A member", event: evMap.get(r.event_id) ?? "", going: going.get(r.event_id) ?? 0 }));
      if (await mail("event-host-summary", ps.get(h.advisor_id), { count: list.length, items, events_url: `${site}/events?tab=hosting` }, { once: `evsum:${h.advisor_id}:${day}` })) sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
