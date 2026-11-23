"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { canon } from "@/lib/zip/hashtags";
import { getTagRules } from "@/lib/zip/hashtags-server";

/** Follow or stop following a hashtag. Following can be switched off by the team. */
export async function toggleTagFollow(tag: string): Promise<{ error?: string; following?: boolean }> {
  const { supabase, userId } = await requireUser();
  const r = await getTagRules();
  const t = canon(String(tag ?? "").replace(/^#/, ""), r.merge);
  if (!/^[a-zà-ſ][a-z0-9_à-ſ]{1,39}$/.test(t)) return { error: "That is not a hashtag." };
  const { data: have } = await supabase.from("hashtag_follows").select("tag").eq("user_id", userId).eq("tag", t).maybeSingle();
  if (have) {
    const { error } = await supabase.from("hashtag_follows").delete().eq("user_id", userId).eq("tag", t);
    if (error) return { error: error.message };
    revalidatePath("/hashtags");
    return { following: false };
  }
  if (!r.follow) return { error: "The Hub team has turned off following hashtags." };
  const { error } = await supabase.from("hashtag_follows").insert({ user_id: userId, tag: t });
  if (error) return { error: error.message };
  revalidatePath("/hashtags");
  return { following: true };
}
