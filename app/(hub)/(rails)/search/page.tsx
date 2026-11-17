import { AUTHOR_FIELDS, cleanTerm, fetchPosts, getViewer, type Author } from "@/lib/hub";
import { Empty, GroupLine, PageTitle, PersonLine, PostCard } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";

type GroupRow = { slug: string; name: string; is_private: boolean; group_members: { count: number }[] };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const term = cleanTerm((await searchParams).q ?? "");
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const [people, groups, posts] = term
    ? await Promise.all([
        supabase
          .from("profiles")
          .select(AUTHOR_FIELDS)
          .or(`full_name.ilike.%${term}%,headline.ilike.%${term}%,location.ilike.%${term}%`)
          .limit(6),
        supabase
          .from("groups")
          .select("slug, name, is_private, group_members(count)")
          .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
          .limit(6),
        fetchPosts(supabase, userId, { search: term, limit: 10 }),
      ])
    : [{ data: [] }, { data: [] }, []];
  const members = (people.data ?? []) as Author[];
  const groupRows = (groups.data ?? []) as unknown as GroupRow[];
  const nothing = term && members.length + groupRows.length + posts.length === 0;

  return (
    <>
      <PageTitle title="Search" />
      <form className="panel flex gap-2 p-3">
        <input name="q" defaultValue={term} autoFocus placeholder="Search people, groups and posts" aria-label="Search" className="field flex-1" />
        <SubmitButton tone="dark">Search</SubmitButton>
      </form>

      {!term && <Empty title="What are you looking for?">Try a name, a city, an industry or a topic.</Empty>}
      {nothing && <Empty title={`Nothing found for "${term}"`}>Check the spelling or try a broader word.</Empty>}

      {members.length > 0 && (
        <section className="panel p-4">
          <h2 className="mb-3 text-[15px] font-semibold">People</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((m) => (
              <PersonLine key={m.id} person={m} />
            ))}
          </div>
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
