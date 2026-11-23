import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The real member count and a few member photos for the sign-up page. Nothing invented: no members, no number. */
export async function loadProof() {
  try {
    const supabase = await createClient();
    const [{ count }, { data }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_sample", false),
      supabase.from("profiles").select("avatar_url").eq("is_sample", false).not("avatar_url", "is", null).order("created_at", { ascending: false }).limit(5),
    ]);
    return { members: count ?? 0, faces: ((data ?? []) as { avatar_url: string }[]).map((r) => r.avatar_url) };
  } catch {
    return { members: 0, faces: [] as string[] };
  }
}
