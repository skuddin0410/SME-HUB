import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Details } from "@/components/profile-extras";

const EMPTY: Details = { helps_with: [], needs: [], availability: [], social_links: {}, visibility: {}, private_browsing: false };

/** The signed-in member's own extra profile fields (the database only returns their own row). */
export async function loadOwnDetails(supabase: SupabaseClient, userId: string): Promise<Details> {
  const { data } = await supabase.from("profile_details").select("helps_with, needs, availability, social_links, custom_fields, visibility, private_browsing").eq("user_id", userId).maybeSingle();
  return { ...EMPTY, ...(data ?? {}) } as Details;
}
