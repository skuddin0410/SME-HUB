import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { siteUrl } from "@/lib/courses-mail";
import { EV_SELECT, evDateBlock, evHostOf, evIcs, evWhen, evWhere, type Ev } from "@/lib/events";
import { addRegistrant, cancelRegistrant, createMeeting, deleteMeeting, ZoomError } from "./zoom";
import { mail, people } from "./mail";

/** Update 36: events that run on the host's own Zoom, and the emails every registration sends. */
export type EvZoom = Ev & { join_mode: "link" | "zoom"; zoom_wr: boolean; zoom_reg: boolean; zoom_rec: boolean };
type Priv = { meeting_link: string; zoom_meeting_id: string | null; zoom_status: "" | "ok" | "pending" };

export async function loadEvZoom(id: string): Promise<{ e: EvZoom; p: Priv | null } | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data } = await db.from("hub_events").select(`${EV_SELECT}, join_mode, zoom_wr, zoom_reg, zoom_rec`).eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: p } = await db.from("hub_event_private").select("meeting_link, zoom_meeting_id, zoom_status").eq("event_id", id).maybeSingle();
  return { e: data as unknown as EvZoom, p: (p as Priv | null) ?? null };
}

const minutesOf = (e: Ev) => (e.starts_at && e.ends_at ? Math.round((Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60000) : 60);

/** On publish (and "Try again"): create the meeting on the host's Zoom. Publishing never waits on Zoom. */
export async function setupEventMeeting(id: string): Promise<boolean> {
  const db = serviceClient();
  const x = await loadEvZoom(id);
  if (!db || !x || x.e.join_mode !== "zoom" || !x.e.host_id || !x.e.starts_at) return false;
  if (x.p?.zoom_meeting_id) return true;
  try {
    const m = await createMeeting(x.e.host_id, {
      topic: x.e.title, agenda: x.e.description, start: new Date(x.e.starts_at), minutes: minutesOf(x.e),
      waitingRoom: x.e.zoom_wr, registration: x.e.zoom_reg, record: x.e.zoom_rec,
    });
    // with "Registered people only" each person gets their own link; otherwise everyone registered uses this one
    await db.from("hub_event_private").upsert({ event_id: id, zoom_meeting_id: m.id, zoom_status: "ok", meeting_link: x.e.zoom_reg ? "" : m.join_url });
    // people who registered while the link was pending get theirs now
    if (x.e.zoom_reg) {
      const { data: regs } = await db.from("event_rsvps").select("user_id").eq("event_id", id).limit(1000);
      for (const r of (regs ?? []) as { user_id: string }[]) await personalLink(id, r.user_id);
    }
    return true;
  } catch (e) {
    console.error("event zoom:", (e as Error).message);
    await db.from("hub_event_private").upsert({ event_id: id, zoom_status: "pending" });
    const ps = await people([x.e.host_id]);
    await mail("event-link-pending", ps.get(x.e.host_id), { event_name: x.e.title, event_url: `${siteUrl()}/events/${x.e.slug}` }, { key: `evpending:${id}:${new Date().toISOString().slice(0, 13)}` });
    return false;
  }
}

/** A registered person's own Zoom link (created on first need, kept so it is the same link every time). */
export async function personalLink(eventId: string, userId: string): Promise<string | null> {
  const db = serviceClient();
  if (!db) return null;
  const { data: have } = await db.from("event_join_links").select("join_url").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  if (have) return (have as { join_url: string }).join_url;
  const x = await loadEvZoom(eventId);
  if (!x || x.e.join_mode !== "zoom" || !x.e.host_id) return null;
  if (!x.e.zoom_reg) return x.p?.meeting_link || null;
  if (!x.p?.zoom_meeting_id) return null;
  const ps = await people([userId]);
  const me = ps.get(userId);
  if (!me?.email) return null;
  try {
    const r = await addRegistrant(x.e.host_id, x.p.zoom_meeting_id, { email: me.email, name: me.name });
    await db.from("event_join_links").upsert({ event_id: eventId, user_id: userId, join_url: r.join_url, registrant_id: r.registrant_id });
    return r.join_url;
  } catch (e) {
    if (!(e instanceof ZoomError)) console.error("registrant:", (e as Error).message);
    return null;
  }
}

/** After someone registers (free or paid): their link, their ticket email, and the host's email. */
export async function afterRegistered(eventId: string, userId: string) {
  const db = serviceClient();
  const x = await loadEvZoom(eventId);
  if (!db || !x) return;
  const { e } = x;
  const site = siteUrl();
  const zoom = e.join_mode === "zoom" && e.fmt === "online";
  const link = zoom ? await personalLink(eventId, userId) : null;
  const ids = [userId, ...(e.host_id ? [e.host_id] : [])];
  const ps = await people(ids);
  const { data: hp } = e.host_id ? await db.from("profiles").select("full_name, avatar_url, headline, location, plan, profile_type").eq("id", e.host_id).maybeSingle() : { data: null };
  const host = evHostOf(e, hp as never);
  const me = ps.get(userId);
  const ics = { name: "event.ics", body: evIcs(e, site, { week: false, day: true, hour: true }, link), method: "PUBLISH" };
  const b = evDateBlock(e);
  if (zoom) {
    await mail("event-ticket", me, { event_name: e.title, event_when: evWhen(e, true), event_host: host.name, join_url: link ?? `${site}/events/${e.slug}`, event_url: `${site}/events/${e.slug}` }, { once: `evreg:${eventId}:${userId}`, ics });
  } else {
    await mail("event-registered", me, {
      event_name: e.title, event_when: evWhen(e, true), event_where: evWhere(e), event_host: host.name, event_day: b?.d ?? "", event_mon: b?.mon ?? "",
      event_url: `${site}/events/${e.slug}`, calendar_url: `${site}/events/${e.slug}/ics`,
    }, { once: `evreg:${eventId}:${userId}`, ics });
  }
  if (e.host_id && e.host_id !== userId) {
    const { data: s } = await db.from("consult_settings").select("reg_mail").eq("advisor_id", e.host_id).maybeSingle();
    if (((s as { reg_mail?: string } | null)?.reg_mail ?? "each") === "each") {
      const { data: g } = await db.rpc("event_going", { p_ids: [eventId] });
      await mail("event-new-registration", ps.get(e.host_id), {
        member_name: me?.name ?? "A member", member_role: me?.headline ?? "", event_name: e.title, event_when: evWhen(e, true),
        going: ((g ?? []) as { going: number }[])[0]?.going ?? 1, event_url: `${site}/events/${e.slug}`, profile_url: `${site}/members/${userId}`,
      }, { once: `evhost:${eventId}:${userId}` });
    }
  }
}

/** Someone cancelled: their personal link stops working. */
export async function afterUnregistered(eventId: string, userId: string) {
  const db = serviceClient();
  if (!db) return;
  const { data: l } = await db.from("event_join_links").select("registrant_id").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  const reg = (l as { registrant_id?: string } | null)?.registrant_id;
  if (reg) {
    const x = await loadEvZoom(eventId);
    const ps = await people([userId]);
    if (x?.e.host_id && x.p?.zoom_meeting_id) await cancelRegistrant(x.e.host_id, x.p.zoom_meeting_id, reg, ps.get(userId)?.email ?? "");
  }
  await db.from("event_join_links").delete().eq("event_id", eventId).eq("user_id", userId);
  await db.from("mail_sent").delete().in("key", [`evreg:${eventId}:${userId}`, `evhost:${eventId}:${userId}`]);
}

/** The host cancelled: the Zoom meeting goes, and everyone registered gets an email (the bell is done in the database). */
export async function afterEventCancelled(eventId: string) {
  const db = serviceClient();
  const x = await loadEvZoom(eventId);
  if (!db || !x) return;
  const { e, p } = x;
  if (e.host_id && p?.zoom_meeting_id) {
    try {
      await deleteMeeting(e.host_id, p.zoom_meeting_id);
    } catch (err) {
      console.error("event zoom delete:", (err as Error).message);
    }
  }
  const { data: regs } = await db.from("event_rsvps").select("user_id").eq("event_id", eventId).limit(2000);
  const ids = ((regs ?? []) as { user_id: string }[]).map((r) => r.user_id);
  const ps = await people([...ids, ...(e.host_id ? [e.host_id] : [])]);
  const host = e.host_id ? ps.get(e.host_id)?.name ?? "The host" : "SME Hub";
  const b = evDateBlock(e);
  for (const id of ids) {
    await mail("event-cancelled", ps.get(id), {
      event_name: e.title, event_when: evWhen(e, true), event_where: evWhere(e), event_host: host, event_day: b?.d ?? "", event_mon: b?.mon ?? "",
      cancel_reason: `${host} cancelled this event.`, events_url: `${siteUrl()}/events`,
    }, { once: `evcancel:${eventId}:${id}` });
  }
}
