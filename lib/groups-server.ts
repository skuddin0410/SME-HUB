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
  const base = (data as GroupSettings | null) ?? GROUP_FALLBACK;
  // what the team saved on the Groups settings page is laid over the table, key by key
  const { data: saved } = await supabase.from("hub_settings").select("value").eq("key", "groups").maybeSingle();
  const v = (saved as { value?: Record<string, unknown> } | null)?.value;
  if (!v) return base;
  const out: GroupSettings = { ...base };
  const has = (k: string) => k in v;
  if (has("create")) out.create_private = v.create === "all" ? "all" : "paid";
  if (has("privJoin")) out.priv_join = v.privJoin === "invite" ? "invite" : "request";
  if (v.layout === "grid" || v.layout === "list") out.layout = v.layout;
  if (has("header")) out.header = v.header === "side" ? "side" : "top";
  if (v.card && typeof v.card === "object") out.card = { ...base.card, ...(v.card as object) };
  if (v.head && typeof v.head === "object") out.head = { ...base.head, ...(v.head as object) };
  if (typeof v.defCover === "string") out.def_cover = v.defCover as GroupSettings["def_cover"];
  if (typeof v.msgAll === "boolean") out.msg_all = v.msgAll;
  if (typeof v.archive === "boolean") out.archive = v.archive;
  if (Array.isArray(v.types) && v.types.length) out.types = (v.types as unknown[]).map(String).slice(0, 12);
  return out;
});
