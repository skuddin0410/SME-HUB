import { getViewer } from "@/lib/hub";
import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { HashtagsBody } from "@/components/zip/settings-pages";
import { getMyTags, getTagIndex } from "@/lib/zip/hashtags-server";
import { loadSettings } from "@/lib/zip/settings-load";

export const metadata = { title: "Hashtag settings", robots: { index: false } };

export default async function Page() {
  const { supabase, gate } = await teamViewer("Hashtag settings");
  if (gate) return gate;
  const initial = await loadSettings(supabase, "hashtags");
  const { userId } = await getViewer();
  const [tags, mineTags] = await Promise.all([getTagIndex(supabase), getMyTags(supabase, userId)]);
  const mine = mineTags.length;

  return (
    <TeamWrap>
      <TeamHead title="Hashtag settings" text="Decide where hashtags work, who can start new ones and which words are not allowed. Press Save changes when you are done." />
      <SettingsForm pageKey="hashtags" initial={initial}>
        <HashtagsBody tags={tags} mine={mine} />
      </SettingsForm>
    </TeamWrap>
  );
}
