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
