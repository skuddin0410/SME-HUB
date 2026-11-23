import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { AutomationsBody } from "@/components/zip/settings-pages";
import { loadSettings } from "@/lib/zip/settings-load";
import { publishQueuedPost } from "@/app/(hub)/team-actions";

export const metadata = { title: "Automations", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Automations");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "automations");
  return (
    <TeamWrap>
      <TeamHead title="Automations" text="Set it up once and the Hub does the follow-up for you: welcomes, reminders, win-backs and scheduled posts. Press Save changes when you are done." />
      <SettingsForm pageKey="automations" initial={initial}><AutomationsBody publish={publishQueuedPost} /></SettingsForm>
    </TeamWrap>
  );
}
