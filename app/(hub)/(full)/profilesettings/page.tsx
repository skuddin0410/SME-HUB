import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { ProfilesBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Profile and directory settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Profile and directory settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "profiles");
  const [{ data: gs }, { count }] = await Promise.all([supabase.from("groups").select("slug, name").eq("is_private", false).order("name").limit(12), supabase.from("profiles").select("id", { count: "exact", head: true })]);
  const groups = ((gs ?? []) as { slug: string; name: string }[]).map((g): [string, string] => [g.slug, g.name]);
  return (
    <TeamWrap>
      <TeamHead title="Profile and directory settings" text="Decide what a member profile holds, how the directory looks and who can reach whom. Press Save changes when you are done." />
      <SettingsForm pageKey="profiles" initial={initial}>
        <ProfilesBody groups={groups} signedUp={count ?? 0} />
      </SettingsForm>
    </TeamWrap>
  );
}
