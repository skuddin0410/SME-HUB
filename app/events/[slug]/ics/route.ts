import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EV_SELECT, evIcs, type Ev } from "@/lib/events";

/** Update 35: one event as a calendar file (Apple Calendar, Outlook and others), with the member's own reminders as alarms. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase.from("hub_events").select(EV_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  const e = data as Ev | null;
  if (!e || !e.starts_at) return new NextResponse("This event has no date yet.", { status: 404 });
  const { data: u } = await supabase.auth.getUser();
  let rem = { week: false, day: true, hour: true };
  let link: string | null = null;
  if (u.user) {
    const [r, l] = await Promise.all([
      supabase.from("event_reminders").select("week, day, hour").eq("event_id", e.id).eq("user_id", u.user.id).maybeSingle(),
      supabase.rpc("event_link", { p_event: e.id }),
    ]);
    if (r.data) rem = r.data as typeof rem;
    link = typeof l.data === "string" && l.data ? l.data : null;
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://smehub.ca").replace(/\/$/, "");
  return new NextResponse(evIcs(e, site, rem, link), {
    headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${slug}.ics"`, "cache-control": "private, no-store" },
  });
}
