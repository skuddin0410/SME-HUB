import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULTS, mergeSettings, type Defaults, type SettingsKey } from "@/lib/zip/settings";

/** What the team saved for a page, laid over the defaults. */
export async function loadSettings<K extends keyof Defaults & SettingsKey>(supabase: SupabaseClient, key: K): Promise<Defaults[K]> {
  const { data } = await supabase.from("hub_settings").select("value").eq("key", key).maybeSingle();
  return mergeSettings(DEFAULTS[key], (data as { value?: unknown } | null)?.value);
}
