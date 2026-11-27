import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { loadEvents } from "@/lib/events-load";
import { evCalLinks, evWhen, evWhere } from "@/lib/events";
import { EventPage } from "@/components/zip/event-page";
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
          link={(going || e.mine) && typeof link.data === "string" && link.data ? (link.data as string) : null}
          site={site()}
          hostCard={e.host_kind === "member" ? e.host : null}
        />
      </div>
    </div>
  );
}
