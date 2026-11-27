"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { getStripe } from "@/lib/stripe";
import { courseTax, provinceOf, PROVINCES as TAX_PROV } from "@/lib/courses-shared";
import { EV_IMGS, EV_PROV, EV_TOPICS, EV_TYPES, EV_TZ, zonedToUtc } from "@/lib/events";
import { serviceClient } from "@/lib/supabase/service";
import { afterEventCancelled, afterRegistered, afterUnregistered, loadEvZoom, personalLink, setupEventMeeting } from "@/lib/apps/event-zoom";
import { meetingReport, recordingLink } from "@/lib/apps/zoom";
import { mail, people } from "@/lib/apps/mail";
import { siteUrl } from "@/lib/courses-mail";

/** Updates 35 and 37: saving, registering, reminders, and hosting (SME Advisors only, checked by the database too). */
type Result = { ok: true; url?: string; slug?: string } | { ok: false; error: string };
const UUID = /^[0-9a-f-]{36}$/i;
const NOT_READY = "Events are almost ready. Please try again later.";

function why(message: string): string {
  if (message.includes("event_full")) return "Sorry, this event is full.";
  if (message.includes("event_past")) return "This event has already started.";
  if (message.includes("event_no_date")) return "The date isn’t set yet. Save it and we’ll tell you when it is.";
  if (message.includes("event_unavailable")) return "This event isn’t available any more.";
  if (message.includes("event_needs_payment")) return "This event needs a ticket. Use Register to pay.";
  if (/event_saves|event_reminders|hub_event/.test(message)) return NOT_READY;
  return "Could not save that. Check your connection and try again.";
}
async function origin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

export async function saveEvent(id: string, on: boolean): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId } = await requireUser();
  if (!on) {
    const { data: reg } = await supabase.from("event_rsvps").select("event_id").eq("event_id", id).eq("user_id", userId).maybeSingle();
    if (reg) return { ok: false, error: "You are registered. Cancel your registration first to remove it." };
  }
  const { error } = on
    ? await supabase.from("event_saves").upsert({ event_id: id, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("event_saves").delete().eq("event_id", id).eq("user_id", userId);
  if (error) return { ok: false, error: why(error.message) };
  revalidatePath("/events");
  return { ok: true };
}

/** Register: free events straight away; paid events go to Stripe Checkout (price + HST for the member's province). */
export async function registerEvent(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId, profile } = await requireUser();
  const { data: e } = await supabase.from("hub_events").select("id, slug, title, price, starts_at, cancelled_at, status, cap").eq("id", id).maybeSingle();
  if (!e || e.status !== "published" || e.cancelled_at) return { ok: false, error: "This event isn’t available any more." };
  if (!e.starts_at) return { ok: false, error: "The date isn’t set yet. Save it and we’ll tell you when it is." };
  if (Date.parse(e.starts_at as string) < Date.now()) return { ok: false, error: "This event has already started." };
  if (e.cap) {
    // a full event takes no more, and nobody pays for a seat that isn't there
    const { data: g } = await supabase.rpc("event_going", { p_ids: [id] });
    if ((((g ?? []) as { going: number }[])[0]?.going ?? 0) >= (e.cap as number)) return { ok: false, error: "Sorry, this event is full." };
  }
  if ((e.price ?? 0) > 0) {
    const stripe = getStripe();
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return { ok: false, error: "Ticket payments are being set up. Please try again soon." };
    const prov = provinceOf((profile as { location?: string } | null)?.location) ?? "ON";
    const t = courseTax(e.price as number, TAX_PROV[prov] ? prov : "ON");
    const base = await origin();
    const { data: u } = await supabase.auth.getUser();
    try {
      const s = await stripe.checkout.sessions.create({
        mode: "payment",
        currency: "cad",
        line_items: [
          { quantity: 1, price_data: { currency: "cad", unit_amount: t.cents, product_data: { name: e.title as string, description: "SME Hub event ticket" } } },
          { quantity: 1, price_data: { currency: "cad", unit_amount: t.tax, product_data: { name: t.label } } },
        ],
        client_reference_id: userId,
        customer_email: u.user?.email ?? undefined,
        payment_intent_data: { metadata: { kind: "event", event_id: id, user_id: userId } },
        metadata: { kind: "event", event_id: id, user_id: userId, price_cents: String(t.cents), tax_cents: String(t.tax) },
        success_url: `${base}/events/${e.slug}?paid=1`,
        cancel_url: `${base}/events/${e.slug}?paid=0`,
      });
      return s.url ? { ok: true, url: s.url } : { ok: false, error: "Ticket payments are being set up. Please try again soon." };
    } catch {
      return { ok: false, error: "Could not start the payment. Please try again." };
    }
  }
  const { error } = await supabase.from("event_rsvps").insert({ event_id: id, user_id: userId });
  if (error && !error.message.includes("duplicate")) return { ok: false, error: why(error.message) };
  // Update 36: their own Zoom link (when the event runs on the host's Zoom), the ticket email, and the host's email
  if (!error) await afterRegistered(id, userId);
  revalidatePath("/events");
  revalidatePath(`/events/${e.slug}`);
  return { ok: true };
}

export async function cancelRegistration(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId } = await requireUser();
  const { data: r } = await supabase.from("event_rsvps").select("payment_id").eq("event_id", id).eq("user_id", userId).maybeSingle();
  if (r?.payment_id) return { ok: false, error: "This was a paid ticket. Email billing@smehub.ca to cancel it." };
  const { error } = await supabase.from("event_rsvps").delete().eq("event_id", id).eq("user_id", userId);
  if (error) return { ok: false, error: why(error.message) };
  await afterUnregistered(id, userId);
  revalidatePath("/events");
  return { ok: true };
}

export async function setEventReminder(id: string, key: "week" | "day" | "hour", on: boolean): Promise<Result> {
  if (!UUID.test(id) || !["week", "day", "hour"].includes(key)) return { ok: false, error: "Unknown reminder." };
  const { supabase, userId } = await requireUser();
  const cur = (await supabase.from("event_reminders").select("week, day, hour").eq("event_id", id).eq("user_id", userId).maybeSingle()).data as { week: boolean; day: boolean; hour: boolean } | null;
  const row = { event_id: id, user_id: userId, ...(cur ?? { week: false, day: true, hour: true }), [key]: on };
  const { error } = await supabase.from("event_reminders").upsert(row);
  if (error) return { ok: false, error: why(error.message) };
  return { ok: true };
}

export type HostForm = {
  title: string; type: string; topic: string; desc: string; date: string; start: string; end: string; tz: string;
  fmt: "online" | "inperson"; link: string; venue: string; city: string; prov: string; paid: boolean; price: string; cap: string; img: string;
  /** Update 36: "How will people join?" My Zoom account (Advisors with Zoom connected) or Paste a link. */
  join?: "zoom" | "link"; wr?: boolean; reg?: boolean; rec?: boolean;
};

/** Publish an event (SME Advisors only). It goes live straight away on Hub Events. */
export async function hostEvent(f: HostForm): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const { data: can } = await supabase.rpc("can_host_events", { uid: userId });
  if (can !== true) return { ok: false, error: "Hosting events is for SME Advisors." };
  const title = String(f.title ?? "").trim().slice(0, 90);
  const miss: string[] = [];
  if (!title) miss.push("a title");
  if (!/^\d{4}-\d\d-\d\d$/.test(f.date)) miss.push("a date");
  if (!/^\d\d:\d\d$/.test(f.start) || !/^\d\d:\d\d$/.test(f.end)) miss.push("start and end times");
  if (f.fmt === "inperson" && !String(f.city ?? "").trim()) miss.push("a city");
  if (f.paid && !(Number(f.price) > 0)) miss.push("a price");
  if (miss.length) return { ok: false, error: `Please add ${miss.join(", ")}` };
  if (f.end <= f.start) return { ok: false, error: "The end time needs to be after the start time" };
  const tz = EV_TZ[f.tz] ? f.tz : "ET";
  const starts = zonedToUtc(f.date, f.start, tz);
  const ends = zonedToUtc(f.date, f.end, tz);
  if (starts.getTime() < Date.now()) return { ok: false, error: "Choose a date and time in the future" };
  const link = String(f.link ?? "").trim();
  const zoom = f.fmt === "online" && f.join === "zoom";
  if (f.fmt === "online" && !zoom && link && !/^https:\/\/[^\s<>"]{4,290}$/.test(link)) return { ok: false, error: "The meeting link needs to start with https://" };
  if (zoom) {
    const db = serviceClient();
    const { data: z } = db ? await db.from("advisor_zoom").select("user_id").eq("user_id", userId).maybeSingle() : { data: null };
    if (!z) return { ok: false, error: "Connect your Zoom first, or choose Paste a link" };
  }
  const slug = `${title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "event"}-${Math.random().toString(36).slice(2, 7)}`;
  const desc = String(f.desc ?? "").trim().slice(0, 2000);
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const row = {
    slug,
    title,
    description: desc || `Hosted by ${(me as { full_name?: string } | null)?.full_name ?? "an SME Advisor"}.`,
    host_kind: "member",
    host_id: userId,
    type: (EV_TYPES as readonly string[]).includes(f.type) ? f.type : "Webinar",
    topic: (EV_TOPICS as readonly string[]).includes(f.topic) ? f.topic : "Community",
    fmt: f.fmt === "inperson" ? "inperson" : "online",
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    tz,
    city: f.fmt === "inperson" ? String(f.city).trim().slice(0, 80) : "",
    prov: f.fmt === "inperson" && EV_PROV[f.prov] ? f.prov : "",
    venue: f.fmt === "inperson" ? String(f.venue ?? "").trim().slice(0, 160) : "",
    price: f.paid ? Math.round(Number(f.price)) : 0,
    cap: Number(f.cap) > 0 ? Math.round(Number(f.cap)) : null,
    img: (EV_IMGS as readonly string[]).includes(f.img) ? f.img : "laptop",
    when_label: "",
    location: f.fmt === "online" ? "Online" : String(f.city).trim(),
    status: "published",
    ...(zoom ? { join_mode: "zoom", zoom_wr: f.wr !== false, zoom_reg: f.reg !== false, zoom_rec: f.rec === true } : {}),
  };
  const { data, error } = await supabase.from("hub_events").insert(row).select("id, slug").single();
  if (error) return { ok: false, error: /row-level|policy/.test(error.message) ? "Hosting events is for SME Advisors." : why(error.message) };
  if (row.fmt === "online" && link && !zoom) await supabase.from("hub_event_private").upsert({ event_id: data.id, meeting_link: link });
  // Update 36: the meeting on the host's Zoom. If Zoom fails, the event is live anyway: "Link pending", Try again, and an email
  if (zoom) await setupEventMeeting(data.id as string);
  revalidatePath("/events");
  return { ok: true, slug: data.slug as string };
}

/** The host cancels: everyone who saved or registered is told (in the database). */
export async function cancelHostedEvent(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId } = await requireUser();
  const { data: done, error } = await supabase.from("hub_events").update({ cancelled_at: new Date().toISOString() }).eq("id", id).eq("host_id", userId).is("cancelled_at", null).select("id");
  if (error) return { ok: false, error: why(error.message) };
  if (done?.length) await afterEventCancelled(id);
  revalidatePath("/events");
  return { ok: true };
}

// ---------- Update 36: the host's Zoom, the green room and the wrap-up ----------
async function hostOnly(id: string) {
  if (!UUID.test(id)) return null;
  const { userId } = await requireUser();
  const x = await loadEvZoom(id);
  return x && x.e.host_id === userId ? { ...x, userId } : null;
}

/** "Try again" when Zoom didn't create the meeting at publish. */
export async function retryEventZoom(id: string): Promise<Result> {
  const x = await hostOnly(id);
  if (!x) return { ok: false, error: "Only the host can do that." };
  const ok = await setupEventMeeting(id);
  revalidatePath(`/events/${x.e.slug}`);
  return ok ? { ok: true } : { ok: false, error: "Zoom still isn’t answering. Check Connected apps, or try again in a few minutes." };
}

const NOTES = ["Starting in 5 minutes", "Running a little late", "Slides are in the chat"];
/** The green room's quick notes: an email and a bell notification to everyone registered. */
export async function sendEventNote(id: string, note: string): Promise<Result> {
  if (!NOTES.includes(note)) return { ok: false, error: "Unknown note." };
  const x = await hostOnly(id);
  if (!x) return { ok: false, error: "Only the host can do that." };
  const db = serviceClient();
  if (!db) return { ok: false, error: NOT_READY };
  const { supabase } = await requireUser();
  const { data: rl } = await supabase.rpc("rate_hit", { p_key: `evnote:${id}`, p_max: 6, p_window: 3600 });
  if (rl === false) return { ok: false, error: "You’ve sent a few notes already. Try again a little later." };
  const { data: regs } = await db.from("event_rsvps").select("user_id").eq("event_id", id).limit(2000);
  const ids = ((regs ?? []) as { user_id: string }[]).map((r) => r.user_id);
  const ps = await people([x.userId, ...ids]);
  const host = ps.get(x.userId)?.name ?? "The host";
  const site = siteUrl();
  if (ids.length) await db.from("notifications").insert(ids.map((u) => ({ user_id: u, actor_id: x.userId, type: "event", href: `/events/${x.e.slug}`, note: `${note}: ${x.e.title}`.slice(0, 200) })));
  for (const u of ids) await mail("event-note", ps.get(u), { host_name: host, note, event_name: x.e.title, join_url: `${site}/events/${x.e.slug}/join` }, { key: `evnote:${id}:${u}:${note}:${new Date().toISOString().slice(0, 15)}` });
  return { ok: true };
}

/** After the event: attendance and minutes from Zoom (once), and the recording link when there is one. */
export async function eventWrap(id: string): Promise<{ attended: number | null; minutes: number | null; recording: string | null; registered: number; talk: number } | null> {
  const x = await hostOnly(id);
  const db = serviceClient();
  if (!x || !db) return null;
  const { data: pv } = await db.from("hub_event_private").select("wrap").eq("event_id", id).maybeSingle();
  let wrap = ((pv as { wrap?: { attended: number | null; minutes: number | null; recording: string | null; at: string } | null } | null)?.wrap) ?? null;
  const meeting = x.p?.zoom_meeting_id;
  const ended = Date.parse(x.e.ends_at ?? x.e.starts_at ?? "") < Date.now();
  // ask Zoom again for up to 2 days after the event, until it has the numbers and the recording
  if (meeting && ended && (!wrap || ((wrap.attended === null || (x.e.zoom_rec && !wrap.recording)) && Date.now() - Date.parse(wrap.at) > 15 * 60000 && Date.now() - Date.parse(x.e.ends_at ?? "") < 2 * 86400_000))) {
    const [rep, rec] = await Promise.all([meetingReport(x.userId, meeting), x.e.zoom_rec ? recordingLink(x.userId, meeting) : Promise.resolve(null)]);
    wrap = { attended: rep?.attended ?? null, minutes: rep?.minutes ?? null, recording: rec, at: new Date().toISOString() };
    await db.from("hub_event_private").update({ wrap }).eq("event_id", id);
  }
  const [{ count: registered }, { count: talk }] = await Promise.all([
    db.from("event_rsvps").select("user_id", { count: "exact", head: true }).eq("event_id", id),
    db.from("event_talk").select("user_id", { count: "exact", head: true }).eq("event_id", id),
  ]);
  return { attended: wrap?.attended ?? null, minutes: wrap?.minutes ?? null, recording: wrap?.recording ?? null, registered: registered ?? 0, talk: talk ?? 0 };
}

/** Wrap-up: share the recording, or send the thank-you note, to everyone registered (each once). */
export async function wrapFollowUp(id: string, what: "recording" | "thanks"): Promise<Result> {
  const x = await hostOnly(id);
  const db = serviceClient();
  if (!x || !db) return { ok: false, error: "Only the host can do that." };
  const w = await eventWrap(id);
  if (what === "recording" && !w?.recording) return { ok: false, error: "Zoom hasn’t finished the recording yet. Try again later." };
  const { data: regs } = await db.from("event_rsvps").select("user_id").eq("event_id", id).limit(2000);
  const ids = ((regs ?? []) as { user_id: string }[]).map((r) => r.user_id);
  const ps = await people([x.userId, ...ids]);
  const host = ps.get(x.userId);
  const site = siteUrl();
  for (const u of ids) {
    if (what === "recording") {
      await mail("event-recording", ps.get(u), { event_name: x.e.title, event_host: host?.name ?? "The host", recording_url: w!.recording, rec_length: w?.minutes ? `${w.minutes} minutes` : "", slides_url: `${site}/events/${x.e.slug}` }, { once: `evrec:${id}:${u}` });
    } else {
      await mail("event-thanks", ps.get(u), { event_name: x.e.title, host_name: host?.name ?? "The host", host_first: host?.first ?? "the host", message_url: `${site}/messages?with=${x.userId}`, profile_url: `${site}/members/${x.userId}` }, { once: `evthanks:${id}:${u}` });
    }
  }
  return { ok: true };
}

/** "I'd like to talk to the host about this" (after the event, for people who registered). They go into the host's My leads. */
export async function askToTalk(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("event_talk").insert({ event_id: id, user_id: userId });
  if (error && !/duplicate/.test(error.message)) return { ok: false, error: /row-level|policy/.test(error.message) ? "This is for people who registered, after the event." : why(error.message) };
  return { ok: true };
}

/** The member's own join link (or, for the host, nothing: they use the green room). */
export async function myJoinLink(id: string): Promise<string | null> {
  if (!UUID.test(id)) return null;
  const { supabase, userId } = await requireUser();
  const { data: r } = await supabase.from("event_rsvps").select("event_id").eq("event_id", id).eq("user_id", userId).maybeSingle();
  return r ? personalLink(id, userId) : null;
}
