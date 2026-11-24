import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { GRANT_FIELDS, provFromLocation, type AiLeft, type Grant, type GrantSave } from "@/lib/grants";

/** Every active program, checked ones first (public). */
export const getGrants = cache(async (): Promise<Grant[]> => {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("grant_programs").select(GRANT_FIELDS).order("sort").order("name");
  return (data ?? []) as Grant[];
});

export const getGrant = cache(async (id: string): Promise<Grant | null> => {
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return null;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("grant_programs").select(GRANT_FIELDS).eq("id", id).maybeSingle();
  return (data as Grant | null) ?? null;
});

export type GrantMe = { saves: GrantSave[]; ai: AiLeft | null; prov: string | null; industry: string; team: string };

/** The signed-in member's saves, AI allowance and the profile answers the matches use. Null for visitors. */
export const getGrantMe = cache(async (): Promise<GrantMe | null> => {
  const { supabase, userId, profile } = await getViewer();
  if (!userId) return null;
  const [{ data: saves }, { data: ai }, { data: det }] = await Promise.all([
    supabase.from("grant_saves").select("program_id, stage, ready").eq("user_id", userId).order("created_at"),
    supabase.rpc("grant_ai_left"),
    supabase.from("profile_details").select("core").eq("user_id", userId).maybeSingle(),
  ]);
  const core = ((det as { core?: { industry?: string; team?: string } } | null)?.core ?? {}) as { industry?: string; team?: string };
  return {
    saves: (saves ?? []) as GrantSave[],
    ai: (ai as AiLeft | null) ?? null,
    prov: provFromLocation((profile as { location?: string | null } | null)?.location),
    industry: core.industry ?? "",
    team: core.team ?? "",
  };
});
