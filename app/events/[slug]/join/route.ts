import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { serviceClient } from "@/lib/supabase/service";
import { personalLink } from "@/lib/apps/event-zoom";
import { siteUrl } from "@/lib/courses-mail";

export const dynamic = "force-dynamic";

/**
 * Update 36: "Join on Zoom". Sends a registered member to their own Zoom link, from 15 minutes before the start
 * until the end. The host goes to the green room instead. Before that, back to the event page.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = siteUrl();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.redirect(`${site}/events`);
  const page = `${site}/events/${slug}`;
  const { supabase, userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=${encodeURIComponent(`/events/${slug}/join`)}`);
  const db = serviceClient();
  if (!db) return NextResponse.redirect(page);
  const { data: e } = await db.from("hub_events").select("id, host_id, starts_at, ends_at, cancelled_at, join_mode").eq("slug", slug).maybeSingle();
  const ev = e as { id: string; host_id: string | null; starts_at: string | null; ends_at: string | null; cancelled_at: string | null; join_mode: string } | null;
  if (!ev || ev.cancelled_at || !ev.starts_at) return NextResponse.redirect(page);
  if (ev.host_id === userId) return NextResponse.redirect(`${page}/green-room`);
  const start = Date.parse(ev.starts_at), end = ev.ends_at ? Date.parse(ev.ends_at) : start + 3600_000;
  if (Date.now() < start - 15 * 60000 || Date.now() > end + 30 * 60000) return NextResponse.redirect(page);
  const { data: r } = await supabase.from("event_rsvps").select("event_id").eq("event_id", ev.id).eq("user_id", userId).maybeSingle();
  if (!r) return NextResponse.redirect(page);
  const link = ev.join_mode === "zoom" ? await personalLink(ev.id, userId) : ((await supabase.rpc("event_link", { p_event: ev.id })).data as string | null);
  return NextResponse.redirect(link || page);
}
