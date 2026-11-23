import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { GroupsBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Group settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Group settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "groups");

  return (
    <TeamWrap>
      <TeamHead title="Group settings" text="Decide who can start groups, how people join and how groups look. Press Save changes when you are done." />
      <SettingsForm pageKey="groups" initial={initial}>
        <GroupsBody />
      </SettingsForm>
    </TeamWrap>
  );
}
