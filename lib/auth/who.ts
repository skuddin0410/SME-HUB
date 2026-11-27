import type { SupabaseClient } from "@supabase/supabase-js";

/** Shown for a moment after logging in: the member's first name, photo and location (for their city on the map). */
export type Who = { first: string; avatar: string | null; location: string | null };

/** The signed-in member's welcome details. Never throws: a missing profile just gives a plain welcome. */
export async function whoIs(supabase: SupabaseClient): Promise<Who | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url, location").eq("id", u.user.id).maybeSingle();
    const p = data as { full_name?: string | null; avatar_url?: string | null; location?: string | null } | null;
    const meta = (u.user.user_metadata ?? {}) as Record<string, unknown>;
    const first =
      (p?.full_name ?? "").trim().split(/\s+/)[0] ||
      String(meta.first_name || meta.given_name || String(meta.full_name || "").split(" ")[0] || "");
    return { first: first.slice(0, 40), avatar: p?.avatar_url || null, location: p?.location || null };
  } catch {
    return null;
  }
}
