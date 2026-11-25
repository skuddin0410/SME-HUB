"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { getProfileStories, getStoryRules } from "@/lib/stories";
import { REPORT_REASONS, storyError, type Story, type StoryAudience, type StoryHighlight } from "@/lib/stories-shared";

export type StoryResult = { ok?: boolean; error?: string; id?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const AUD: StoryAudience[] = ["public", "members", "conn"];

async function member() {
  const v = await getViewer();
  if (!v.userId) throw new Error("Sign in first.");
  return v;
}

export type NewItem = { path: string; kind: "image" | "video"; poster?: string | null; seconds?: number | null };

/** Publishes (or sends for review) a story whose files are already uploaded. The database checks every rule again. */
export async function createStory(input: { caption: string; audience: string; company: string | null; items: NewItem[] }): Promise<StoryResult> {
  try {
    const v = await member();
    if (!AUD.includes(input.audience as StoryAudience)) return { error: "Choose who can see this." };
    if (input.company && !isId(input.company)) return { error: "Choose a business you post for." };
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10).map((i) => ({
      path: String(i.path ?? ""),
      kind: i.kind === "video" ? "video" : "image",
      poster: i.poster ? String(i.poster) : null,
      seconds: typeof i.seconds === "number" && Number.isFinite(i.seconds) ? Math.round(i.seconds * 10) / 10 : null,
    }));
    if (!items.length) return { error: "Add a photo or video." };
    const { data, error } = await v.supabase.rpc("story_create", {
      p_caption: String(input.caption ?? "").slice(0, 220),
      p_audience: input.audience,
      p_company: input.company || null,
      p_items: items,
    });
    if (error) return { error: storyError(error.message) };
    revalidatePath("/feed");
    return { ok: true, id: data as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : storyError("") };
  }
}

/** Counts the items as seen by this viewer (each person once). */
export async function markStorySeen(itemIds: string[]): Promise<void> {
  const ids = itemIds.filter(isId).slice(0, 20);
  if (!ids.length) return;
  const v = await getViewer();
  if (!v.userId) return;
  await v.supabase.rpc("story_mark_seen", { p_items: ids });
}

export async function likeStory(storyId: string, on: boolean): Promise<StoryResult> {
  if (!isId(storyId)) return { error: "Unknown story." };
  const v = await member();
  const q = on
    ? v.supabase.from("story_likes").insert({ story_id: storyId, member_id: v.userId })
    : v.supabase.from("story_likes").delete().eq("story_id", storyId).eq("member_id", v.userId!);
  const { error } = await q;
  if (error && !/duplicate/.test(error.message)) return { error: storyError(error.message) };
  return { ok: true };
}

export async function deleteStory(storyId: string): Promise<StoryResult> {
  if (!isId(storyId)) return { error: "Unknown story." };
  const v = await member();
  const { error } = await v.supabase.rpc("story_delete", { p_story: storyId });
  if (error) return { error: storyError(error.message) };
  revalidatePath("/feed");
  return { ok: true };
}

export async function reportStory(storyId: string, reason: string): Promise<StoryResult> {
  if (!isId(storyId)) return { error: "Unknown story." };
  if (!REPORT_REASONS.includes(reason)) return { error: "Choose a reason." };
  const v = await member();
  const { error } = await v.supabase.from("reports").insert({ reporter_id: v.userId, story_id: storyId, reason });
  if (error) return { error: /row-level|policy/.test(error.message) ? "This story can’t be reported." : storyError(error.message) };
  return { ok: true };
}

export type Viewers = { names: boolean; list: { id: string; name: string; avatar: string | null; liked: boolean }[] };
/** Who viewed one of my stories (names only when the team allows it). */
export async function storyViewers(storyId: string): Promise<Viewers> {
  if (!isId(storyId)) return { names: false, list: [] };
  const v = await member();
  const rules = await getStoryRules(v);
  const { data } = await v.supabase.rpc("story_viewers", { p_story: storyId });
  const list = ((data ?? []) as { member_id: string; full_name: string | null; avatar_url: string | null; liked: boolean }[]).map((r) => ({ id: r.member_id, name: r.full_name || "A member", avatar: r.avatar_url, liked: r.liked }));
  return { names: rules.showViewers || v.isStaff, list };
}

export async function storyCounts(ids: string[]): Promise<Record<string, { views: number; likes: number }>> {
  const v = await member();
  const { data } = await v.supabase.rpc("story_counts", { p_stories: ids.filter(isId).slice(0, 100) });
  const out: Record<string, { views: number; likes: number }> = {};
  for (const r of (data ?? []) as { story_id: string; views: number; likes: number }[]) out[r.story_id] = { views: r.views, likes: r.likes };
  return out;
}

/** My stories and highlights, for the highlight windows. */
export async function myStoryData(): Promise<{ stories: Story[]; highlights: StoryHighlight[] }> {
  const v = await member();
  const rules = await getStoryRules(v);
  const d = await getProfileStories(v, v.userId!, rules.hours);
  return { stories: d.stories.filter((s) => s.status === "published" || s.status === "pending"), highlights: d.highlights };
}

export async function saveHighlight(input: { id: string | null; name: string; items: string[]; cover: string | null }): Promise<StoryResult> {
  const v = await member();
  const name = String(input.name ?? "").trim();
  if (!name) return { error: "Give the highlight a name." };
  const items = (input.items ?? []).filter(isId).slice(0, 100);
  if (!items.length) return { error: "Choose at least one story." };
  const { data, error } = await v.supabase.rpc("story_highlight_save", {
    p_id: input.id && isId(input.id) ? input.id : null, p_name: name.slice(0, 30), p_items: items, p_cover: isId(input.cover) ? input.cover : null,
  });
  if (error) return { error: storyError(error.message) };
  revalidatePath("/members/[id]", "page");
  return { ok: true, id: data as string };
}

export async function addToHighlight(highlightId: string, storyId: string): Promise<StoryResult> {
  if (!isId(highlightId) || !isId(storyId)) return { error: "Unknown highlight." };
  const v = await member();
  const { error } = await v.supabase.rpc("story_highlight_add", { p_highlight: highlightId, p_story: storyId });
  if (error) return { error: storyError(error.message) };
  revalidatePath("/members/[id]", "page");
  return { ok: true };
}

export async function deleteHighlight(highlightId: string): Promise<StoryResult> {
  if (!isId(highlightId)) return { error: "Unknown highlight." };
  const v = await member();
  const { error } = await v.supabase.rpc("story_highlight_delete", { p_highlight: highlightId });
  if (error) return { error: storyError(error.message) };
  revalidatePath("/members/[id]", "page");
  return { ok: true };
}

/** The Hub team's review buttons. */
export async function moderateStory(storyId: string, action: "approve" | "reject" | "remove" | "dismiss" | "restore"): Promise<StoryResult> {
  if (!isId(storyId) || !["approve", "reject", "remove", "dismiss", "restore"].includes(action)) return { error: "Unknown action." };
  const v = await member();
  if (!v.isStaff) return { error: "Moderators only." };
  const { error } = await v.supabase.rpc("story_moderate", { p_story: storyId, p_action: action });
  if (error) return { error: storyError(error.message) };
  revalidatePath("/moderation");
  revalidatePath("/feed");
  return { ok: true };
}
