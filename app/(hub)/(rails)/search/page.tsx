import Link from "next/link";
import { AUTHOR_FIELDS, cleanTerm, fetchPosts, ftsQuery, getDegrees, getViewer, type Author } from "@/lib/hub";
import { Empty, GroupLine, PageTitle, PersonLine, PostCard } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";

export const metadata = { title: "Search", robots: { index: false } };

type GroupRow = { slug: string; name: string; is_private: boolean; group_members: { count: number }[] };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const term = cleanTerm((await searchParams).q ?? "");
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const fts = ftsQuery(term);

  const [people, groups, businesses, posts] = fts
    ? await Promise.all([
        supabase.rpc("search_profiles", { q: fts }).select(AUTHOR_FIELDS).limit(8),
        supabase.from("groups").select("slug, name, is_private, group_members(count)").textSearch("fts", fts, { config: "english" }).limit(6),
        supabase.from("companies").select("slug, name, category").textSearch("fts", fts, { config: "english" }).limit(6),
        fetchPosts(supabase, userId, { search: term, limit: 10 }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, []];
  const members = (people.data ?? []) as Author[];
  const groupRows = (groups.data ?? []) as unknown as GroupRow[];
  const companies = (businesses.data ?? []) as { slug: string; name: string; category: string }[];
  const degrees = await getDegrees(supabase, userId, members.map((m) => m.id));
  const nothing = term && members.length + groupRows.length + companies.length + posts.length === 0;

  return (
    <>
      <PageTitle title="Search" />
      <form className="panel flex gap-2 p-3">
        <input name="q" defaultValue={term} autoFocus placeholder="Search people, businesses, groups and posts" aria-label="Search" className="field flex-1" />
        <SubmitButton tone="dark">Search</SubmitButton>
      </form>

      {!term && <Empty title="What are you looking for?">Try a name, a city, an industry or a topic.</Empty>}
      {nothing && <Empty title={`Nothing found for "${term}"`}>Check the spelling or try a broader word.</Empty>}

      {members.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-3 text-[15px] font-semibold">People</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <PersonLine key={m.id} person={m} degree={degrees.get(m.id)} />
            ))}
          </div>
        </section>
      )}
      {companies.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Businesses</h2>
          <ul className="grid gap-x-3 gap-y-2 sm:grid-cols-2">
            {companies.map((c) => (
              <li key={c.slug} className="min-w-0">
                <Link href={`/businesses/${c.slug}`} className="block truncate text-sm font-semibold hover:text-primary hover:underline">
                  {c.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{c.category || "Business"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groupRows.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-3 text-[15px] font-semibold">Groups</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {groupRows.map((g) => (
              <GroupLine key={g.slug} group={{ ...g, members: g.group_members[0]?.count ?? 0 }} />
            ))}
          </div>
        </section>
      )}
      {posts.length > 0 && <h2 className="mt-2 text-lg font-semibold">Posts</h2>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} />
      ))}
    </>
  );
}
