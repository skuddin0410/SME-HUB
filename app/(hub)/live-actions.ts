"use server";

import { getViewer } from "@/lib/hub";
import { liveConnections, liveEvents, type LiveEvent } from "@/lib/network-live";

/**
 * New events for "Your network, live" since a moment the page already has. Read with the member's own session, so it
 * only ever returns their own connections' activity that they are allowed to see.
 */
export async function liveSince(after: string): Promise<LiveEvent[]> {
  const { supabase, userId } = await getViewer();
  if (!userId) return [];
  const t = Date.parse(after);
  // never further back than a day, so a stale tab cannot ask for everything
  const from = new Date(Number.isFinite(t) ? Math.max(t, Date.now() - 86400_000) : Date.now() - 60_000).toISOString();
  const people = await liveConnections(supabase, userId);
  return liveEvents(supabase, userId, people, from);
}
