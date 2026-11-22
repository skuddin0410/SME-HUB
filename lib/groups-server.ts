import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { GROUP_FALLBACK, type GroupSettings } from "@/lib/groups";

/** Group rules live in the database (group_settings) so staff can change them without a deploy. */
export const getGroupSettings = cache(async (): Promise<GroupSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_settings")
    .select("create_private, create_public, priv_join, layout, header, card, head, def_cover, msg_all, archive, types")
    .maybeSingle();
  return (data as GroupSettings | null) ?? GROUP_FALLBACK;
});
