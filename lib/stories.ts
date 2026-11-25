import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getHubSettings } from "@/lib/zip/settings-load";
import { STTYPES, type Story, type StoryAudience, type StoryAuthor, type StoryHighlight, type StoryRules, type StoryStatus } from "@/lib/stories-shared";

type Viewer = { supabase: SupabaseClient; userId: string | null; profile: object | null; isStaff: boolean };

const num = (v: unknown, d: number) => (typeof v === "string" && /^\d{1,4}$/.test(v) ? Number(v) : typeof v === "number" ? v : d);

/** The team's Stories settings, cut down to what the browser needs, and whether this viewer may post. */
export async function getStoryRules(viewer: Viewer): Promise<StoryRules> {
  const s = await getHubSettings("stories");
  const publish = (["all", "paid", "team"].includes(String(s.publish)) ? s.publish : "all") as StoryRules["publish"];
  const aud = s.aud as Record<string, boolean>;
  const audiences = (["public", "members", "conn"] as StoryAudience[]).filter((k) => aud[k]);
  const paid = ["plus", "advisor"].includes(String((viewer.profile as { plan?: string } | null)?.plan));
  const canPost = !!viewer.userId && (viewer.isStaff || publish === "all" || (publish === "paid" && paid));
  return {
    canPost,
    publish,
    approval: !!s.approval && !viewer.isStaff,
    audiences: audiences.length ? audiences : ["members"],
    defAud: audiences.includes(s.defAud as StoryAudience) ? (s.defAud as StoryAudience) : audiences[0] ?? "members",
    hours: num(s.dur, 24),
    types: Object.keys(STTYPES).filter((k) => (s.types as Record<string, boolean>)[k]),
    maxMB: num(s.maxMB, 25),
    maxVid: num(s.maxVid, 30),
    perMember: num(s.perMember, 3),
    perStory: num(s.perStory, 5),
    likes: !!s.likes,
    showViewers: !!s.showViewers,
  };
}

type Row = {
  id: string; author_id: string; company_id: string | null; caption: string; audience: StoryAudience; status: StoryStatus | "deleted";
  published_at: string; created_at: string;
  items: { id: string; kind: "image" | "video"; poster_path: string | null; position: number }[] | null;
  author: { full_name: string | null; avatar_url: string | null } | null;
  company: { id: string; name: string; slug: string; logo_url: string | null } | null;
};
const SELECT = "id, author_id, company_id, caption, audience, status, published_at, created_at, items:story_items(id, kind, poster_path, position), author:profiles!stories_author_id_fkey(full_name, avatar_url), company:companies(id, name, slug, logo_url)";

/** Turns rows into stories, with what this viewer has seen and liked, and each author's business. */
async function shape(supabase: SupabaseClient, userId: string | null, rows: Row[], hours: number): Promise<Story[]> {
  if (!rows.length) return [];
  const itemIds = rows.flatMap((r) => (r.items ?? []).map((i) => i.id));
  const authors = [...new Set(rows.map((r) => r.author_id))];
  const [seenRes, likedRes, bizRes] = await Promise.all([
    userId && itemIds.length ? supabase.from("story_seen").select("item_id").eq("viewer_id", userId).in("item_id", itemIds) : Promise.resolve({ data: [] }),
    userId ? supabase.from("story_likes").select("story_id").eq("member_id", userId).in("story_id", rows.map((r) => r.id)) : Promise.resolve({ data: [] }),
    supabase.from("companies").select("owner_id, name").in("owner_id", authors).eq("status", "published").order("created_at").limit(200),
  ]);
  const seen = new Set(((seenRes.data ?? []) as { item_id: string }[]).map((x) => x.item_id));
  const liked = new Set(((likedRes.data ?? []) as { story_id: string }[]).map((x) => x.story_id));
  const biz = new Map<string, string>();
  for (const b of (bizRes.data ?? []) as { owner_id: string; name: string }[]) if (!biz.has(b.owner_id)) biz.set(b.owner_id, b.name);
  const cutoff = Date.now() - hours * 3_600_000;
  return rows
    .filter((r) => r.status !== "deleted" && (r.items ?? []).length)
    .map((r) => {
      const items = [...(r.items ?? [])].sort((a, b) => a.position - b.position);
      return {
        id: r.id,
        authorId: r.author_id,
        author: { name: r.author?.full_name || "A member", avatar: r.author?.avatar_url ?? null, biz: r.company ? "" : biz.get(r.author_id) ?? "" },
        company: r.company ? { id: r.company.id, name: r.company.name, slug: r.company.slug, logo: r.company.logo_url } : null,
        caption: r.caption,
        audience: r.audience,
        status: r.status as StoryStatus,
        publishedAt: r.published_at,
        items: items.map((i) => ({ id: i.id, kind: i.kind, poster: !!i.poster_path })),
        liked: liked.has(r.id),
        seen: items.filter((i) => seen.has(i.id)).map((i) => i.id),
        mine: r.author_id === userId,
        live: r.status === "published" && new Date(r.published_at).getTime() > cutoff,
      };
    });
}

/** The feed row: everyone's live stories this viewer may see (unseen first, then newest), and the viewer's own. */
export async function getFeedStories(viewer: Viewer, hours: number): Promise<{ authors: StoryAuthor[]; mine: Story[] }> {
  const { supabase, userId } = viewer;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const [live, own] = await Promise.all([
    supabase.from("stories").select(SELECT).eq("status", "published").gt("published_at", since).order("published_at", { ascending: true }).limit(300),
    userId ? supabase.from("stories").select(SELECT).eq("author_id", userId).eq("status", "pending").order("created_at").limit(20) : Promise.resolve({ data: [] }),
  ]);
  const all = await shape(supabase, userId, [...((live.data ?? []) as unknown as Row[]), ...((own.data ?? []) as unknown as Row[])], hours);
  const mine = all.filter((s) => s.mine && (s.status === "pending" || s.live));
  const by = new Map<string, Story[]>();
  // a business's stories sit under the business, a member's under the member
  for (const s of all) if (!s.mine && s.live) { const k = s.company ? `b_${s.company.id}` : s.authorId; by.set(k, [...(by.get(k) ?? []), s]); }
  const authors: StoryAuthor[] = [...by.entries()].map(([id, list]) => ({
    id,
    name: list[0].company?.name ?? list[0].author.name,
    avatar: list[0].company ? list[0].company.logo : list[0].author.avatar,
    unseen: list.some((s) => s.items.some((i) => !s.seen.includes(i.id))),
    latest: list[list.length - 1].publishedAt,
    stories: list,
  }));
  authors.sort((a, b) => Number(b.unseen) - Number(a.unseen) || b.latest.localeCompare(a.latest));
  return { authors, mine };
}

/** A profile's "Stories and highlights": today's live stories, highlights, and for the owner every story they posted. */
export async function getProfileStories(viewer: Viewer, memberId: string, hours: number): Promise<{ live: Story[]; highlights: StoryHighlight[]; all: Story[]; stories: Story[] }> {
  const { supabase, userId } = viewer;
  const owner = userId === memberId;
  const [rowsRes, hlRes] = await Promise.all([
    supabase.from("stories").select(SELECT).eq("author_id", memberId).neq("status", "deleted").order("created_at", { ascending: false }).limit(owner ? 100 : 60),
    supabase.from("story_highlights").select("id, name, cover_item, items:story_highlight_items(item_id, position)").eq("owner_id", memberId).order("created_at").limit(30),
  ]);
  const stories = await shape(supabase, userId, (rowsRes.data ?? []) as unknown as Row[], hours);
  const itemStory = new Map<string, string>();
  for (const s of stories) for (const i of s.items) itemStory.set(i.id, s.id);
  const highlights: StoryHighlight[] = ((hlRes.data ?? []) as { id: string; name: string; cover_item: string | null; items: { item_id: string; position: number }[] | null }[]).map((h) => {
    // an item shows only if this viewer may see its story (the database hid the rest)
    const items = [...(h.items ?? [])].sort((a, b) => a.position - b.position).filter((x) => itemStory.has(x.item_id)).map((x) => ({ storyId: itemStory.get(x.item_id)!, itemId: x.item_id }));
    const ok = (id: string | null) => !!id && items.some((x) => x.itemId === id);
    return { id: h.id, name: h.name, cover: ok(h.cover_item) ? h.cover_item : items[0]?.itemId ?? null, items };
  });
  const live = stories.filter((s) => s.live).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return { live, highlights: owner ? highlights : highlights.filter((h) => h.items.length), all: owner ? stories : [], stories };
}

/** Views and likes for the author's own stories. */
export async function getStoryCounts(supabase: SupabaseClient, ids: string[]): Promise<Record<string, { views: number; likes: number }>> {
  if (!ids.length) return {};
  const { data } = await supabase.rpc("story_counts", { p_stories: ids });
  const out: Record<string, { views: number; likes: number }> = {};
  for (const r of (data ?? []) as { story_id: string; views: number; likes: number }[]) out[r.story_id] = { views: r.views, likes: r.likes };
  return out;
}
