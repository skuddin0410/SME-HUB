import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CONSULT } from "@/lib/consult";

/** Update 36: what Connected apps and Free consultations show the signed-in member. */
export async function myApps(supabase: SupabaseClient, userId: string) {
  const [{ data: can }, { data: apps }, { data: s }] = await Promise.all([
    supabase.rpc("can_host_events", { uid: userId }),
    supabase.rpc("my_apps"),
    supabase.from("consult_settings").select("*").eq("advisor_id", userId).maybeSingle(),
  ]);
  const a = (apps ?? {}) as { zoom?: { email: string; type: number } | null; gcal?: { email: string } | null };
  return {
    advisor: can === true,
    zoom: a.zoom ?? null,
    gcal: a.gcal ?? null,
    settings: { ...DEFAULT_CONSULT, ...((s ?? {}) as Partial<typeof DEFAULT_CONSULT>) },
    ready: apps !== null || can !== null,
  };
}
