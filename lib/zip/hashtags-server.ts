import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canon, tagOk, tagRules, type TagRules } from "@/lib/zip/hashtags";
import { getHubSettings } from "@/lib/zip/settings-load";

/** The team's hashtag rules, read once per request. */
export const getTagRules = cache(async (): Promise<TagRules & { on: boolean; comments: boolean; follow: boolean; trend: boolean; profile: boolean; auto: boolean; create: string }> => {
  const s = await getHubSettings("hashtags");
  return { ...tagRules(s), on: !!s.posts, comments: !!s.comments, follow: !!s.follow, trend: !!s.trend, profile: !!s.profile, auto: !!s.auto, create: String(s.create) };
});

export type TagRow = { tag: string; uses: number; fresh: number; people: number; followers: number; last: string | null };

/** Every hashtag in use that this viewer may see, with merges applied, newest activity and most-used first. */
export async function getTagIndex(supabase: SupabaseClient): Promise<TagRow[]> {
  const r = await getTagRules();
  if (!r.on) return [];
  const [{ data: use }, { data: fol }] = await Promise.all([
    supabase.rpc("hashtag_usage", { with_comments: r.comments, fresh_days: 7 }),
    supabase.rpc("hashtag_followers"),
  ]);
  const followers = new Map<string, number>();
  for (const f of (fol ?? []) as { tag: string; followers: number }[]) followers.set(canon(f.tag, r.merge), (followers.get(canon(f.tag, r.merge)) ?? 0) + Number(f.followers));
  const out = new Map<string, TagRow>();
  for (const u of (use ?? []) as { tag: string; uses: number; fresh: number; people: number; last_used: string }[]) {
    if (!tagOk(u.tag, r)) continue;
    const c = canon(u.tag, r.merge);
    const row = out.get(c) ?? { tag: c, uses: 0, fresh: 0, people: 0, followers: followers.get(c) ?? 0, last: null };
    row.uses += Number(u.uses); row.fresh += Number(u.fresh); row.people = Math.max(row.people, Number(u.people));
    if (!row.last || u.last_used > row.last) row.last = u.last_used;
    out.set(c, row);
  }
  return [...out.values()].sort((a, b) => b.fresh - a.fresh || b.uses - a.uses || (a.tag < b.tag ? -1 : 1));
}

/** The tags this member follows (their own rows only), with merges applied and removed tags left out. */
export async function getMyTags(supabase: SupabaseClient, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const r = await getTagRules();
  const { data } = await supabase.from("hashtag_follows").select("tag").eq("user_id", userId).limit(200);
  return [...new Set(((data ?? []) as { tag: string }[]).map((x) => canon(x.tag, r.merge)).filter((t) => !r.removed[t]))];
}

/** Every spelling that now points at this tag, so a search finds posts written before it was merged. */
export function aliasesOf(tag: string, merge: Record<string, string>): string[] {
  const out = [tag];
  for (const k of Object.keys(merge)) if (canon(k, merge) === tag && !out.includes(k)) out.push(k);
  return out;
}
