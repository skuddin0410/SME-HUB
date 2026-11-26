import type { Metadata } from "next";
import { requireUser } from "@/lib/hub";
import { liveConnections, liveEvents } from "@/lib/network-live";
import { LiveMap } from "@/components/network-live/live-map";
import { Crumbs } from "@/components/zip/crumbs";
import "@/styles/network-live.css";

export const metadata: Metadata = { title: "Your network, live" };
export const dynamic = "force-dynamic";

/** Your connections on a map of Canada, and what they do that involves you, as it happens. Only you see your map. */
export default async function NetworkLivePage() {
  const { supabase, userId, profile } = await requireUser();
  const people = await liveConnections(supabase, userId);
  const events = await liveEvents(supabase, userId, people);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead row">
          <div className="stack grow">
            <Crumbs items={[["Network", "/network"], ["Live map"]]} note="Only you can see your map" lock />
            <h1>Your network, live</h1>
            <p className="muted">Your connections across Canada as it happens: who is online, who is reaching out to you and what they are sharing. Click anyone to see their card.</p>
          </div>
        </div>
        <LiveMap
          me={{ id: userId, name: profile?.full_name || "You", avatar: profile?.avatar_url ?? null, location: profile?.location ?? "" }}
          people={people}
          events={events}
        />
      </div>
    </div>
  );
}
