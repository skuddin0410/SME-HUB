import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";
import { siteUrl } from "@/lib/courses-mail";
import { evWhen, type Ev } from "@/lib/events";
import { callSpan, callWhen, consultIcs, openTimes, type ConsultPublic, type Slot } from "@/lib/consult";
import { createMeeting, deleteMeeting, updateMeeting } from "./zoom";
import { gcalBusy } from "./gcal";
import { mail, people, type Person } from "./mail";

export type Booking = {
  id: string; advisor_id: string; member_id: string; starts_at: string; minutes: number; biz: string; topic: string; web: string;
  status: "booked" | "cancelled"; seq: number; meeting_id: string | null; join_url: string | null; cancelled_by: string | null;
};
const SENDER = "hello@smehub.ca";

/** The calendar's open days and times for one Advisor (Google busy times removed when the Advisor switched that on). */
export async function consultTimes(supabase: SupabaseClient, advisorId: string, ignoreStart?: string): Promise<{ pub: ConsultPublic; days: [string, Slot[]][] }> {
  const { data, error } = await supabase.rpc("consult_public", { p_advisor: advisorId });
  const pub = (!error && data ? data : { open: false }) as ConsultPublic;
  if (!pub.open) return { pub, days: [] };
  let busy: [number, number][] = [];
  const db = serviceClient();
  if (db) {
    const { data: s } = await db.from("consult_settings").select("gcal").eq("advisor_id", advisorId).maybeSingle();
    if ((s as { gcal?: boolean } | null)?.gcal) busy = await gcalBusy(advisorId, new Date(), new Date(Date.now() + (pub.ahead + 1) * 86400_000));
  }
  // moving a booking: its own current time doesn't block the new one
  const taken = ignoreStart ? pub.taken.filter(([a]) => Date.parse(a) !== Date.parse(ignoreStart)) : pub.taken;
  return { pub, days: [...openTimes(pub, taken, pub.held, busy).entries()] };
}

/** Is this exact time still open (rules, other bookings, holds, Google busy)? */
export async function timeIsOpen(supabase: SupabaseClient, advisorId: string, at: string, ignoreStart?: string) {
  const { pub, days } = await consultTimes(supabase, advisorId, ignoreStart);
  const t = Date.parse(at);
  return pub.open && days.some(([, s]) => s.some((x) => Date.parse(x.at) === t));
}

export async function getBooking(id: string): Promise<Booking | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db.from("consult_bookings").select("*").eq("id", id).maybeSingle();
  return (data as Booking | null) ?? null;
}

function icsFor(b: Booking, adv: Person, mem: Person, forMember: boolean, cancelled = false) {
  const site = siteUrl();
  return consultIcs({
    id: b.id, seq: b.seq, start: b.starts_at, minutes: b.minutes, cancelled, site,
    summary: forMember ? `Free consultation with ${adv.name}` : `Free consultation: ${mem.name}`,
    description: forMember
      ? `Free ${b.minutes}-minute consultation on Zoom with ${adv.name}, SME Advisor.${b.join_url ? `\n\nJoin: ${b.join_url}` : ""}\n\n${b.topic ? `Your note: ${b.topic}\n\n` : ""}Reschedule or cancel: ${site}/members/${b.advisor_id}#advbook`
      : `Free ${b.minutes}-minute consultation with ${mem.name}${b.biz ? ` (${b.biz})` : ""}.\n\n${b.topic ? `Their question: ${b.topic}\n\n` : ""}Start the Zoom meeting: ${site}/consult/${b.id}/start`,
    location: forMember ? (b.join_url ?? "Zoom") : `${site}/consult/${b.id}/start`,
    organizer: { name: `${adv.name} via SME Hub`, email: SENDER },
    attendees: [{ name: adv.name, email: adv.email }, { name: mem.name, email: mem.email }],
  });
}

/** A new booking: its own Zoom meeting, both emails with the invite, and a note in the member's inbox. */
export async function afterBooked(id: string) {
  const db = serviceClient();
  let b = await getBooking(id);
  if (!db || !b) return;
  const site = siteUrl();
  const ps = await people([b.advisor_id, b.member_id]);
  const adv = ps.get(b.advisor_id), mem = ps.get(b.member_id);
  if (!adv || !mem) return;
  try {
    const m = await createMeeting(b.advisor_id, {
      topic: `Free consultation: ${mem.name} and ${adv.name}`, agenda: b.topic, start: new Date(b.starts_at), minutes: b.minutes,
      waitingRoom: true, registration: false, record: false,
    });
    await db.from("consult_bookings").update({ meeting_id: m.id, join_url: m.join_url }).eq("id", id);
    b = { ...b, meeting_id: m.id, join_url: m.join_url };
  } catch (e) {
    console.error("consult zoom:", (e as Error).message);
  }
  const when = callWhen(b.starts_at), span = callSpan(b.starts_at, b.minutes);
  await Promise.all([
    mail("consult-booked", mem, {
      advisor_name: adv.name, advisor_first: adv.first, call_when: when, call_span: span, call_length: b.minutes, call_note: b.topic || "Not added",
      join_url: b.join_url ?? `${site}/members/${b.advisor_id}#advbook`, manage_url: `${site}/members/${b.advisor_id}#advbook`, message_url: `${site}/messages?with=${b.advisor_id}`,
    }, { once: `consult:${id}:${b.seq}:m`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, true) } }),
    mail("consult-new-booking", adv, {
      member_name: mem.name, member_first: mem.first, member_role: mem.headline, member_biz: b.biz || "Not added", member_web: b.web || "Not added",
      meeting_id: b.meeting_id ? b.meeting_id.replace(/^(\d{3})(\d{4})(\d+)$/, "$1 $2 $3") : "being set up", call_when: when, call_span: span, call_length: b.minutes,
      call_note: b.topic, start_url: `${site}/consult/${id}/start`, profile_url: `${site}/members/${b.member_id}`, manage_url: `${site}/settings/consultations`,
    }, { once: `consult:${id}:${b.seq}:a`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, false) } }),
    db.rpc("consult_message", {
      p_from: b.advisor_id, p_to: b.member_id,
      p_body: `Your free ${b.minutes}-minute consultation with ${adv.name} is booked for ${when}. The Zoom link and a calendar invite are in your email.`,
    }),
  ]);
}

/** A new time: move the Zoom meeting, and send both people the updated invite (same UID, SEQUENCE + 1). */
export async function afterMoved(id: string, by: string) {
  const db = serviceClient();
  const b = await getBooking(id);
  if (!db || !b) return;
  const site = siteUrl();
  if (b.meeting_id) {
    try {
      await updateMeeting(b.advisor_id, b.meeting_id, { start: new Date(b.starts_at), minutes: b.minutes });
    } catch (e) {
      console.error("consult zoom move:", (e as Error).message);
    }
  }
  const ps = await people([b.advisor_id, b.member_id]);
  const adv = ps.get(b.advisor_id), mem = ps.get(b.member_id);
  if (!adv || !mem) return;
  const span = callSpan(b.starts_at, b.minutes);
  const byName = by === b.member_id ? mem.first : adv.first;
  await Promise.all([
    mail("consult-changed", mem, {
      headline: "Your free consultation has a new time", summary: `${byName === mem.first ? "You" : byName} moved your free call with ${adv.name}.`,
      other_name: adv.name, call_span: span, join_url: b.join_url, button_label: "Join the Zoom meeting", ics_note: "The updated calendar invite is attached.",
    }, { once: `consult:${id}:${b.seq}:m`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, true) } }),
    mail("consult-changed", adv, {
      headline: `New time: free call with ${mem.name}`, summary: `${byName === adv.first ? "You" : byName} moved the free call.`,
      other_name: mem.name, call_span: span, join_url: `${site}/consult/${id}/start`, button_label: "Start the Zoom meeting", ics_note: "The updated calendar invite is attached.",
    }, { once: `consult:${id}:${b.seq}:a`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, false) } }),
  ]);
}

/** Cancelled: delete the Zoom meeting, and both people get an email with the cancelled invite. */
export async function afterCancelled(b: Booking) {
  const site = siteUrl();
  if (b.meeting_id) {
    try {
      await deleteMeeting(b.advisor_id, b.meeting_id);
    } catch (e) {
      console.error("consult zoom delete:", (e as Error).message);
    }
  }
  const ps = await people([b.advisor_id, b.member_id]);
  const adv = ps.get(b.advisor_id), mem = ps.get(b.member_id);
  if (!adv || !mem) return;
  const span = callSpan(b.starts_at, b.minutes);
  const byAdvisor = b.cancelled_by === b.advisor_id;
  await Promise.all([
    mail("consult-changed", mem, {
      headline: "Your free consultation is cancelled", summary: byAdvisor ? `${adv.name} cancelled your free call. Pick another time that suits you.` : `You cancelled your free call with ${adv.name}.`,
      other_name: adv.name, call_span: span, pick_url: byAdvisor ? `${site}/members/${b.advisor_id}#advbook` : "", ics_note: "The cancellation for your calendar is attached.",
    }, { once: `consult:${b.id}:${b.seq}:m`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, true, true), method: "CANCEL" } }),
    mail("consult-changed", adv, {
      headline: `Cancelled: free call with ${mem.name}`, summary: byAdvisor ? "You cancelled this free call. The Zoom meeting is removed." : `${mem.name} cancelled the free call. The time is open again and the Zoom meeting is removed.`,
      other_name: mem.name, call_span: span, ics_note: "The cancellation for your calendar is attached.",
    }, { once: `consult:${b.id}:${b.seq}:a`, ics: { name: "free-consultation.ics", body: icsFor(b, adv, mem, false, true), method: "CANCEL" } }),
  ]);
}

/** The member's own copy of the invite (Add to my calendar on the profile). */
export async function memberIcs(b: Booking, forMember: boolean) {
  const ps = await people([b.advisor_id, b.member_id]);
  const adv = ps.get(b.advisor_id), mem = ps.get(b.member_id);
  if (!adv || !mem) return null;
  return icsFor(b, adv, mem, forMember, b.status === "cancelled");
}

/** The "Zoom is disconnected" email (also sent when the Advisor removes SME Hub inside Zoom). */
export async function zoomGoneEmail(userId: string) {
  const db = serviceClient();
  if (!db) return;
  const now = new Date().toISOString();
  const [{ data: evs }, { data: calls }] = await Promise.all([
    db.from("hub_events").select("id, slug, title, starts_at, ends_at, tz, description, host_kind, host_id, type, topic, fmt, city, prov, venue, price, cap, img, series, agenda, flagship, cancelled_at")
      .eq("host_id", userId).eq("join_mode", "zoom").is("cancelled_at", null).gt("starts_at", now).order("starts_at").limit(20),
    db.from("consult_bookings").select("starts_at, member_id").eq("advisor_id", userId).eq("status", "booked").gt("starts_at", now).order("starts_at").limit(20),
  ]);
  const ps = await people([userId, ...((calls ?? []) as { member_id: string }[]).map((c) => c.member_id)]);
  const items = [
    ...((evs ?? []) as Ev[]).map((e) => ({ title: e.title, when: evWhen(e) })),
    ...((calls ?? []) as { starts_at: string; member_id: string }[]).map((c) => ({ title: `Free consultation with ${ps.get(c.member_id)?.name ?? "a member"}`, when: callWhen(c.starts_at) })),
  ];
  await mail("zoom-disconnected", ps.get(userId), { items, apps_url: `${siteUrl()}/settings/apps` }, { key: `zoom-off:${userId}:${now.slice(0, 16)}` });
}

