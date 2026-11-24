import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { readyCount, type ReadyItems } from "@/lib/ready-shared";

export type MyReady = {
  id: string;
  name: string;
  avatar: string | null;
  headline: string;
  city: string;
  helps: string[];
  items: ReadyItems;
  count: number;
  /** can connect and ask for introductions: has a photo and a headline */
  canReach: boolean;
};

/** The signed-in member's five checks, read once per request. Null for visitors. */
export const getMyReady = cache(async (): Promise<MyReady | null> => {
  const { supabase, userId, profile } = await getViewer();
  if (!userId || !profile) return null;
  const [r, d] = await Promise.all([
    supabase.rpc("my_ready_items"),
    supabase.from("profile_details").select("helps_with").eq("user_id", userId).maybeSingle(),
  ]);
  const row = ((r.data ?? []) as (ReadyItems & { ready_count: number })[])[0];
  const items: ReadyItems = row
    ? { photo: row.photo, headline: row.headline, city: row.city, helps: row.helps, biz: row.biz }
    : { photo: !!profile.avatar_url, headline: !!profile.headline?.trim(), city: !!profile.location?.trim(), helps: false, biz: false };
  return {
    id: userId,
    name: profile.full_name,
    avatar: profile.avatar_url,
    headline: profile.headline ?? "",
    city: profile.location ?? "",
    helps: ((d.data as { helps_with?: string[] } | null)?.helps_with ?? []).slice(0, 5),
    items,
    count: readyCount(items),
    canReach: items.photo && items.headline,
  };
});

/** Real numbers for the yellow line: who looked at my profile, and who searched the Directory near me, in the last 7 days. */
export async function getSignals(): Promise<{ views: number; searches: number }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { views: 0, searches: 0 };
  const { data } = await supabase.rpc("my_profile_signals");
  const row = ((data ?? []) as { views_7d: number; searches_7d: number }[])[0];
  return { views: row?.views_7d ?? 0, searches: row?.searches_7d ?? 0 };
}
