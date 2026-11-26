import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS, mergeSettings, type Defaults, type SettingsKey } from "@/lib/zip/settings";

/** What the team saved for a page, laid over the defaults. */
export async function loadSettings<K extends keyof Defaults & SettingsKey>(supabase: SupabaseClient, key: K): Promise<Defaults[K]> {
  const { data } = await supabase.from("hub_settings").select("value").eq("key", key).maybeSingle();
  return mergeSettings(DEFAULTS[key], (data as { value?: unknown } | null)?.value);
}

/** The same, for server code that has no client in hand: read once per request. */
export const getHubSettings = cache(async <K extends keyof Defaults & SettingsKey>(key: K): Promise<Defaults[K]> => {
  try {
    return await loadSettings(await createClient(), key);
  } catch {
    return DEFAULTS[key];
  }
});

/** What the post composer needs to know, small enough to pass to the browser. */
export type ComposerRules = { polls: boolean; pollMax: number; cover: boolean; schedule: boolean; closeC: boolean; title: "optional" | "required" | "off" };
export async function getComposerRules(): Promise<ComposerRules> {
  const f = await getHubSettings("feed");
  const t = String(f.title);
  return {
    polls: !!f.polls, pollMax: Math.min(10, Math.max(2, Number(f.pollMax) || 10)), cover: !!f.cover, schedule: !!f.schedule, closeC: !!f.closeC,
    title: t === "required" || t === "off" ? t : "optional",
  };
}

/** How a post's actions and comments behave, small enough to pass to the browser. */
export type PostRules = { share: boolean; comments: boolean; flat: boolean; cshow: number; cload: number; editMins: number; title: "optional" | "required" | "off" };
export async function getPostRules(): Promise<PostRules> {
  const f = await getHubSettings("feed");
  return { share: !!f.share, comments: !!f.comments, flat: String(f.thread) === "1", cshow: Math.max(1, Number(f.cshow) || 2), cload: Math.max(1, Number(f.cload) || 10),
    // Update 26: how long authors may edit ("forever" by default); Infinity has no limit
    editMins: f.edit === "forever" ? Infinity : Number.isFinite(Number(f.edit)) ? Number(f.edit) : 10,
    title: String(f.title) === "required" || String(f.title) === "off" ? (String(f.title) as "required" | "off") : "optional",
  };
}

/** Whether this member may start a post, from "Who can post" on the feed settings. The team can always post. */
export async function canStartPost(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const f = await getHubSettings("feed");
  if (f.access === "all") return true;
  const { data } = await supabase.from("profiles").select("role, plan, profile_type").eq("id", userId).maybeSingle();
  const me = data as { role?: string; plan?: string; profile_type?: string } | null;
  if (!me) return false;
  if (me.role && me.role !== "member") return true;
  if (f.access === "paid") return me.plan === "plus" || me.plan === "advisor";
  return !!(f.accessTypes as Record<string, boolean>)[me.profile_type ?? "owner"];
}
