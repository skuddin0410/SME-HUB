import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { loadEvents } from "@/lib/events-load";
import { evCalLinks, evWhen, evWhere } from "@/lib/events";
import { EventPage, type EvZoomView } from "@/components/zip/event-page";
import { personalLink } from "@/lib/apps/event-zoom";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const dynamic = "force-dynamic";
const site = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://smehub.ca").replace(/\/$/, "");

const getOne = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const { supabase, userId } = await getViewer();
  return loadEvents(supabase, userId, { slug });
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = (await getOne(slug))?.events[0];
  if (!e) return { title: "Event not found" };
  return { title: e.title, description: `${evWhen(e, true)} · ${evWhere(e)}. ${e.description}`.slice(0, 300) };
}

/** Update 35: one event's page (smehub.ca/events/<id>). */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const one = await getOne(slug);
  const e = one?.events[0];
  if (!one || !e) notFound();
  const { supabase, userId } = await getViewer();
  const [all, link, faces] = await Promise.all([
    loadEvents(supabase, userId),
    userId && e.fmt === "online" ? supabase.rpc("event_link", { p_event: e.id }) : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name, avatar_url").eq("status", "active").not("avatar_url", "is", null).limit(6),
  ]);
  const similar = (all?.events ?? []).filter((x) => x.id !== e.id && !x.flagship && (x.topic === e.topic || x.type === e.type)).slice(0, 3);
  const going = one.mine.going.includes(e.id);
  // Update 36: an event on the host's own Zoom (read on its own, so the page still works before migration 0074)
  let zoom: EvZoomView | null = null;
  let zlink: string | null = null;
  if (e.fmt === "online" && e.host_kind === "member") {
    const { data: z, error: ze } = await supabase.from("hub_events").select("join_mode, zoom_wr, zoom_reg, zoom_rec").eq("id", e.id).maybeSingle();
    const zr = z as { join_mode?: string; zoom_wr: boolean; zoom_reg: boolean; zoom_rec: boolean } | null;
    if (!ze && zr?.join_mode === "zoom") {
      const [pv, talk] = await Promise.all([
        e.mine ? supabase.from("hub_event_private").select("zoom_meeting_id, zoom_status").eq("event_id", e.id).maybeSingle() : Promise.resolve({ data: null }),
        userId && going ? supabase.from("event_talk").select("user_id").eq("event_id", e.id).eq("user_id", userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const p = pv.data as { zoom_meeting_id: string | null; zoom_status: "" | "ok" | "pending" } | null;
      zoom = { host: e.mine ? { meetingId: p?.zoom_meeting_id ?? null, status: p?.zoom_status ?? "", wr: zr.zoom_wr, reg: zr.zoom_reg, rec: zr.zoom_rec } : null, talked: !!talk.data };
      if (going && userId) zlink = await personalLink(e.id, userId);
    }
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <EventPage
          e={e}
          mine={one.mine}
          signedIn={!!userId}
          similar={similar}
          faces={((faces.data ?? []) as { full_name: string; avatar_url: string | null }[]).slice(0, Math.min(6, e.going)).map((f) => ({ name: f.full_name, avatar: f.avatar_url }))}
          cal={evCalLinks(e, site())}
          link={zoom ? (going ? zlink : null) : (going || e.mine) && typeof link.data === "string" && link.data ? (link.data as string) : null}
          site={site()}
          hostCard={e.host_kind === "member" ? e.host : null}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
