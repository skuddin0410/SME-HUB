import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import { TAXO, type Taxo } from "@/lib/categories";

/** The live master list from the database (the Hub team can add to it), in order. Falls back to the built-in copy. */
export const getTaxo = cache(async (): Promise<Taxo> => {
  const { supabase } = await getViewer();
  const [{ data: ind }, { data: sub }] = await Promise.all([
    supabase.from("industries").select("name, icon, sort").order("sort").order("name"),
    supabase.from("specialities").select("industry, name, sort").order("sort").order("name").limit(5000),
  ]);
  const I = (ind ?? []) as { name: string; icon: string }[];
  if (!I.length) return TAXO;
  const by = new Map<string, string[]>();
  for (const s of (sub ?? []) as { industry: string; name: string }[]) by.set(s.industry, [...(by.get(s.industry) ?? []), s.name]);
  return I.map((i) => [i.name, i.icon, by.get(i.name) ?? []]);
});
