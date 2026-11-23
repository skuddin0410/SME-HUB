import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { BlogsBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Member blog settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Member blog settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "blogs");

  return (
    <TeamWrap>
      <TeamHead title="Member blog settings" text="Decide who can write, what every post must include and how posts look. Press Save changes when you are done." />
      <SettingsForm pageKey="blogs" initial={initial}>
        <BlogsBody />
      </SettingsForm>
    </TeamWrap>
  );
}
