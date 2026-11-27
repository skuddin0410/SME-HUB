import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/hub";
import { evWhen } from "@/lib/events";
import { loadEvZoom } from "@/lib/apps/event-zoom";
import { GreenRoom } from "@/components/zip/green-room";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = { title: "Green room", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Update 36: the host's green room (only the host sees it). */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase, userId } = await requireUser();
  const { data: ev } = await supabase.from("hub_events").select("id").eq("slug", slug).maybeSingle();
  const x = ev ? await loadEvZoom((ev as { id: string }).id) : null;
  if (!x || x.e.host_id !== userId || x.e.join_mode !== "zoom") redirect(`/events/${slug}`);
  const [{ data: room }, { data: me }] = await Promise.all([
    supabase.rpc("event_host_room", { p_event: x.e.id }),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
  ]);
  const r = (room ?? { registered: 0, reminders: 0, faces: [] }) as { registered: number; reminders: number; faces: { name: string; avatar: string | null }[] };
  const m = (me ?? {}) as { full_name?: string; avatar_url?: string | null };
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 12, paddingBottom: 40 }}>
        <GreenRoom d={{
          id: x.e.id, slug, title: x.e.title, when: evWhen(x.e, true), startsAt: x.e.starts_at ?? new Date().toISOString(),
          hostName: m.full_name || "You", hostAvatar: m.avatar_url ?? null, registered: r.registered, reminders: r.reminders, faces: r.faces,
        }} />
      </div>
    </div>
  );
}
