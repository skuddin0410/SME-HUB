import "server-only";
import { cache } from "react";
import { getLinks, getViewer, type LinkState } from "@/lib/hub";

export type Motd = { id: string; full_name: string; headline: string | null; location: string | null; avatar_url: string | null; about: string; day: string };

/**
 * Today's Member of the Day (Update 11): the Hub team's pick for the date, or else an automatic choice of a member
 * whose profile is ready (the database decides and remembers it, so it stays the same all day).
 */
export const getMemberOfTheDay = cache(async (): Promise<{ m: Motd; link: LinkState; me: boolean } | null> => {
  const { supabase, userId } = await getViewer();
  const { data, error } = await supabase.rpc("member_of_the_day");
  if (error || !data) return null;
  const m = data as Motd;
  const link = userId ? ((await getLinks()).get(m.id) ?? "none") : "none";
  return { m, link, me: m.id === userId };
});
