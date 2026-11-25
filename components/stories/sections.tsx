import { getViewer } from "@/lib/hub";
import { getFeedStories, getProfileStories, getStoryCounts, getStoryRules } from "@/lib/stories";
import { getPostingBusinesses } from "@/lib/business-server";
import type { Story } from "@/lib/stories-shared";
import { getHubSettings } from "@/lib/zip/settings-load";
import { StoryHost, type PostAs } from "./host";
import { ModStories, ProfileStories, StoryRow } from "./row";

async function postAsFor(userId: string | null): Promise<PostAs[]> {
  const list = await getPostingBusinesses(userId);
  if (!list.length) return [];
  const { supabase } = await getViewer();
  const { data } = await supabase.from("companies").select("id, logo_url").in("id", list.map((b) => b.id));
  const logo = new Map(((data ?? []) as { id: string; logo_url: string | null }[]).map((c) => [c.id, c.logo_url]));
  return list.map((b) => ({ id: b.id, name: b.name, logo: logo.get(b.id) ?? null }));
}

/** The feed's Community Stories row, with everything it opens. */
export async function FeedStories() {
  const viewer = await getViewer();
  if (!viewer.userId || !viewer.profile) return null;
  const rules = await getStoryRules(viewer);
  const [{ authors, mine }, postAs] = await Promise.all([getFeedStories(viewer, rules.hours), postAsFor(viewer.userId)]);
  const p = viewer.profile as { full_name?: string | null; avatar_url?: string | null };
  return (
    <StoryHost meId={viewer.userId} me={{ name: p.full_name || "You", avatar: p.avatar_url ?? null }} staff={viewer.isStaff} rules={rules} postAs={postAs} active={mine.length}>
      <StoryRow me={{ name: p.full_name || "You", avatar: p.avatar_url ?? null }} authors={authors} mine={mine} />
    </StoryHost>
  );
}

/** "Stories and highlights" on a member's profile. */
export async function ProfileStoriesSection({ memberId, name, avatar }: { memberId: string; name: string; avatar: string | null }) {
  const viewer = await getViewer();
  const rules = await getStoryRules(viewer);
  const owner = viewer.userId === memberId;
  const d = await getProfileStories(viewer, memberId, rules.hours);
  if (!owner && !d.live.length && !d.highlights.length) return null;
  const [counts, postAs] = owner ? await Promise.all([getStoryCounts(viewer.supabase, d.all.map((s) => s.id)), postAsFor(viewer.userId)]) : [{}, []];
  const active = d.all.filter((s) => s.status === "pending" || s.live).length;
  const vp = viewer.profile as { full_name?: string | null; avatar_url?: string | null } | null;
  return (
    <StoryHost meId={viewer.userId} me={{ name: vp?.full_name || "You", avatar: vp?.avatar_url ?? null }} staff={viewer.isStaff} rules={rules} postAs={postAs} active={active}>
      <ProfileStories person={{ id: memberId, name, avatar }} owner={owner} live={d.live} highlights={d.highlights} all={owner ? d.all : d.stories} counts={counts} />
    </StoryHost>
  );
}

type ModStory = Story & { reports: string[] };
const SELECT = "id, author_id, company_id, caption, audience, status, published_at, reports_done, items:story_items(id, kind, poster_path, position), author:profiles!stories_author_id_fkey(full_name, avatar_url)";

/** The Stories tab in Moderation: waiting for approval, reported, and removed or not approved. */
export async function ModStoriesSection() {
  const viewer = await getViewer();
  if (!viewer.isStaff) return null;
  const rules = await getStoryRules(viewer);
  const { supabase } = viewer;
  const [rowsRes, repRes] = await Promise.all([
    supabase.from("stories").select(SELECT).in("status", ["pending", "published", "removed", "rejected"]).order("created_at", { ascending: false }).limit(300),
    supabase.from("reports").select("story_id, reason").not("story_id", "is", null).eq("status", "open").limit(1000),
  ]);
  const reps = new Map<string, string[]>();
  for (const r of (repRes.data ?? []) as { story_id: string; reason: string }[]) reps.set(r.story_id, [...(reps.get(r.story_id) ?? []), r.reason]);
  type R = { id: string; author_id: string; caption: string; audience: Story["audience"]; status: Story["status"]; published_at: string; reports_done: boolean; items: { id: string; kind: "image" | "video"; poster_path: string | null; position: number }[] | null; author: { full_name: string | null; avatar_url: string | null } | null };
  const all: (ModStory & { done: boolean })[] = ((rowsRes.data ?? []) as unknown as R[]).map((r) => ({
    id: r.id, authorId: r.author_id, author: { name: r.author?.full_name || "A member", avatar: r.author?.avatar_url ?? null, biz: "" }, company: null,
    caption: r.caption, audience: r.audience, status: r.status, publishedAt: r.published_at,
    items: [...(r.items ?? [])].sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, kind: i.kind, poster: !!i.poster_path })),
    liked: false, seen: [], mine: false, live: true, reports: reps.get(r.id) ?? [], done: r.reports_done,
  }));
  const approval = !!(await getHubSettings("stories")).approval;
  return (
    <StoryHost meId={viewer.userId} staff rules={rules} postAs={[]} active={0}>
      <ModStories
        approval={approval}
        pending={all.filter((x) => x.status === "pending")}
        reported={all.filter((x) => x.status === "published" && x.reports.length && !x.done)}
        removed={all.filter((x) => x.status === "removed" || x.status === "rejected")}
      />
    </StoryHost>
  );
}
