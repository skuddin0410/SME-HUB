"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { getStripe } from "@/lib/stripe";
import { courseTax, provinceOf, PROVINCES as TAX_PROV } from "@/lib/courses-shared";
import { EV_IMGS, EV_PROV, EV_TOPICS, EV_TYPES, EV_TZ, zonedToUtc } from "@/lib/events";

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
  if (f.fmt === "online" && link && !/^https:\/\/[^\s<>"]{4,290}$/.test(link)) return { ok: false, error: "The meeting link needs to start with https://" };
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
  };
  const { data, error } = await supabase.from("hub_events").insert(row).select("id, slug").single();
  if (error) return { ok: false, error: /row-level|policy/.test(error.message) ? "Hosting events is for SME Advisors." : why(error.message) };
  if (row.fmt === "online" && link) await supabase.from("hub_event_private").upsert({ event_id: data.id, meeting_link: link });
  revalidatePath("/events");
  return { ok: true, slug: data.slug as string };
}

/** The host cancels: everyone who saved or registered is told (in the database). */
export async function cancelHostedEvent(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown event." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("hub_events").update({ cancelled_at: new Date().toISOString() }).eq("id", id).eq("host_id", userId);
  if (error) return { ok: false, error: why(error.message) };
  revalidatePath("/events");
  return { ok: true };
}
