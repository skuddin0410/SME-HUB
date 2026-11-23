import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { StoriesBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Stories settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Stories settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "stories");
  return (
    <TeamWrap>
      <TeamHead title="Stories settings" text="Who can post Community Stories, who can see them, how long they stay and what files are allowed. Press Save changes when you are done." />
      <SettingsForm pageKey="stories" initial={initial}><StoriesBody /></SettingsForm>
    </TeamWrap>
  );
}
