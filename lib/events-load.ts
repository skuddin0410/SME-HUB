import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EV_SELECT, evHostOf, type Ev } from "@/lib/events";
import type { EvItem, EvMine } from "@/components/zip/events-x";

/**
 * Updates 35 and 37: upcoming events (and the ones without a date yet), with their hosts and how many are going,
 * plus what the signed-in member saved, registered for and their reminder choices. Null before migration 0073.
 */
export async function loadEvents(supabase: SupabaseClient, userId: string | null, only?: { slug: string }) {
  const run = (sel: string) => {
    const q = only
      ? supabase.from("hub_events").select(sel).eq("slug", only.slug).eq("status", "published")
      : supabase.from("hub_events").select(sel).eq("status", "published").is("cancelled_at", null).or(`starts_at.is.null,starts_at.gte.${new Date().toISOString()}`);
    return q.order("starts_at", { ascending: true, nullsFirst: false }).limit(300);
  };
  // Update 45 adds "recording" (migration 0080); before it runs, load without it
  let { data, error } = await run(`${EV_SELECT}, recording`);
  if (error && /recording/.test(error.message)) ({ data, error } = await run(EV_SELECT));
  if (error) return null;
  const rows = (data ?? []) as unknown as Ev[];
  const hostIds = [...new Set(rows.map((r) => r.host_id).filter(Boolean))] as string[];
  const [hosts, going, saves, regs, rems] = await Promise.all([
    hostIds.length ? supabase.from("profiles").select("id, full_name, avatar_url, headline, location, plan, profile_type").in("id", hostIds) : Promise.resolve({ data: [] }),
    rows.length ? supabase.rpc("event_going", { p_ids: rows.map((r) => r.id) }) : Promise.resolve({ data: [] }),
    userId ? supabase.from("event_saves").select("event_id").eq("user_id", userId) : Promise.resolve({ data: [] }),
    userId ? supabase.from("event_rsvps").select("event_id").eq("user_id", userId) : Promise.resolve({ data: [] }),
    userId ? supabase.from("event_reminders").select("event_id, week, day, hour").eq("user_id", userId) : Promise.resolve({ data: [] }),
  ]);
  const hm = new Map(((hosts.data ?? []) as { id: string }[]).map((h) => [h.id, h]));
  const gm = new Map(((going.data ?? []) as { event_id: string; going: number }[]).map((g) => [g.event_id, g.going]));
  const events: EvItem[] = rows.map((r) => ({
    ...r,
    agenda: r.agenda ?? [],
    host: evHostOf(r, r.host_id ? (hm.get(r.host_id) as Parameters<typeof evHostOf>[1]) : null),
    going: gm.get(r.id) ?? 0,
    mine: !!userId && r.host_id === userId,
  }));
  const mine: EvMine = {
    saved: ((saves.data ?? []) as { event_id: string }[]).map((x) => x.event_id),
    going: ((regs.data ?? []) as { event_id: string }[]).map((x) => x.event_id),
    rem: Object.fromEntries(((rems.data ?? []) as { event_id: string; week: boolean; day: boolean; hour: boolean }[]).map((x) => [x.event_id, { week: x.week, day: x.day, hour: x.hour }])),
  };
  return { events, mine };
}

export async function canHostEvents(supabase: SupabaseClient, userId: string | null) {
  if (!userId) return false;
  const { data } = await supabase.rpc("can_host_events", { uid: userId });
  return data === true;
}
