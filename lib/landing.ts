import { AUTHOR_FIELDS, type Author } from "@/lib/hub";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

/** Public numbers and a few member faces for the sign-in page. Never blocks the page if the database is unreachable. */
export async function landingData() {
  const empty = { stats: { members: 0, groups: 0, posts: 0 }, people: [] as Author[] };
  if (!hasEnvVars) return empty;
  try {
    const supabase = await createClient();
    const count = (table: string) => supabase.from(table).select("*", { count: "exact", head: true });
    const [members, groups, posts, people] = await Promise.all([
      count("profiles"),
      count("groups"),
      count("posts"),
      supabase.from("profiles").select(AUTHOR_FIELDS).order("created_at", { ascending: false }).limit(8),
    ]);
    return {
      stats: { members: members.count ?? 0, groups: groups.count ?? 0, posts: posts.count ?? 0 },
      people: (people.data ?? []) as Author[],
    };
  } catch {
    return empty;
  }
}
