import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/hub";
import { loadEvZoom } from "@/lib/apps/event-zoom";
import { eventWrap } from "@/app/(hub)/event-actions";
import { WrapUp } from "@/components/zip/green-room";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = { title: "Event wrap-up", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 36: the wrap-up after an event on the host's Zoom (only the host sees it). */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase, userId } = await requireUser();
  const { data: ev } = await supabase.from("hub_events").select("id").eq("slug", slug).maybeSingle();
  const x = ev ? await loadEvZoom((ev as { id: string }).id) : null;
  if (!x || x.e.host_id !== userId || x.e.join_mode !== "zoom") redirect(`/events/${slug}`);
  const w = await eventWrap(x.e.id);
  const ended = Date.parse(x.e.ends_at ?? x.e.starts_at ?? "") < Date.now();
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <WrapUp d={{ id: x.e.id, slug, title: x.e.title, registered: w?.registered ?? 0, attended: w?.attended ?? null, minutes: w?.minutes ?? null, talk: w?.talk ?? 0, recording: w?.recording ?? null, rec: x.e.zoom_rec, ended }} />
      </div>
    </div>
  );
}
