import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { FeedBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Feed settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Feed settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "feed");
  const types = (await loadSettings(supabase, "profiles")).types.map((t): [string, string] => [t[0], t[1]]);
  return (
    <TeamWrap>
      <TeamHead title="Feed settings" text="Decide what members see in the feed, how they post and how comments behave. Press Save changes when you are done." />
      <SettingsForm pageKey="feed" initial={initial}>
        <FeedBody types={types} />
      </SettingsForm>
    </TeamWrap>
  );
}
