import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { StoriesBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Stories settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Stories settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "stories");
  // the numbers at the top: the team reads every story
  const hours = /^\d{1,4}$/.test(String(initial.dur)) ? Number(initial.dur) : 24;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const [live, pending, kept] = await Promise.all([
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("status", "published").gt("published_at", since),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("story_highlight_items").select("item_id, item:story_items!inner(story:stories!inner(status, published_at))", { count: "exact", head: true }).eq("item.story.status", "published").lte("item.story.published_at", since),
  ]);
  return (
    <TeamWrap>
      <TeamHead title="Stories settings" text="Who can post Community Stories, who can see them, how long they stay and what files are allowed. Press Save changes when you are done." />
      <SettingsForm pageKey="stories" initial={initial}><StoriesBody stats={{ live: live.count ?? 0, pending: pending.count ?? 0, kept: kept.count ?? 0 }} /></SettingsForm>
    </TeamWrap>
  );
}
