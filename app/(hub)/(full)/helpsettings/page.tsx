import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { HelpSettingsBody } from "@/components/help/settings";
import { loadSettings } from "@/lib/zip/settings-load";
import { loadHelp } from "@/lib/help";

export const metadata = { title: "Help Centre settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Help Centre settings");
  if (gate) return gate;
  const [initial, kb] = await Promise.all([loadSettings(supabase, "help"), loadHelp()]);
  return (
    <TeamWrap>
      <TeamHead title="Help Centre settings" text="Choose the popular searches and the most asked questions on Help home. Press Save changes when you are done." />
      <SettingsForm pageKey="help" initial={initial}>
        <HelpSettingsBody
          articles={kb.articles.map((a) => ({ id: a.id, title: a.title, topic: a.topic, popular: a.popular }))}
          topics={kb.topics.map((t) => ({ id: t.id, title: t.title }))}
        />
      </SettingsForm>
    </TeamWrap>
  );
}
