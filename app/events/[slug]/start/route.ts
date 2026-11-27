import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { serviceClient } from "@/lib/supabase/service";
import { startUrl } from "@/lib/apps/zoom";
import { siteUrl } from "@/lib/courses-mail";

export const dynamic = "force-dynamic";

/** Update 36: "Go live on Zoom" from the green room. The host's start link is fetched fresh from Zoom (it expires). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = siteUrl();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return NextResponse.redirect(`${site}/events`);
  const { userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=${encodeURIComponent(`/events/${slug}/green-room`)}`);
  const db = serviceClient();
  if (!db) return NextResponse.redirect(`${site}/events/${slug}`);
  const { data: e } = await db.from("hub_events").select("id, host_id").eq("slug", slug).maybeSingle();
  const ev = e as { id: string; host_id: string | null } | null;
  if (!ev || ev.host_id !== userId) return NextResponse.redirect(`${site}/events/${slug}`);
  const { data: p } = await db.from("hub_event_private").select("zoom_meeting_id").eq("event_id", ev.id).maybeSingle();
  const mid = (p as { zoom_meeting_id?: string | null } | null)?.zoom_meeting_id;
  if (!mid) return NextResponse.redirect(`${site}/events/${slug}`);
  try {
    return NextResponse.redirect(await startUrl(userId, mid));
  } catch {
    return NextResponse.redirect(`${site}/events/${slug}/green-room?zoom=failed`);
  }
}
