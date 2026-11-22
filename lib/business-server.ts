import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/business";

const FALLBACK: BusinessSettings = {
  create_mode: "all",
  member_limit: 3,
  pub_approval: true,
  review_approval: false,
  criteria: ["Quality", "Value", "Communication"],
  categories: ["Other"],
  tabs: { photos: true, events: true, jobs: true, shop: true },
};

/** Directory rules live in the database (business_settings) so staff can change them without a deploy. */
export const getBusinessSettings = cache(async (): Promise<BusinessSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("business_settings").select("create_mode, member_limit, pub_approval, review_approval, criteria, categories, tabs").maybeSingle();
  return (data as BusinessSettings | null) ?? FALLBACK;
});

/** Published pages this member may post as (owner, manager or editor). */
export async function getPostingBusinesses(userId: string | null): Promise<{ id: string; name: string }[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_team")
    .select("role, company:companies!inner(id, name, status)")
    .eq("user_id", userId)
    .in("role", ["owner", "manager", "editor"])
    .eq("company.status", "published");
  return ((data ?? []) as unknown as { company: { id: string; name: string } }[]).map((r) => ({ id: r.company.id, name: r.company.name }));
}
