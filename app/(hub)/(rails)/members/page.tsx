import { ftsQuery, getDegrees, getLinks, getViewer, MEMBER_TYPES } from "@/lib/hub";
import { Empty, PageTitle, Pager } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { PersonCard, type Person } from "@/components/network-client";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Members", description: "Meet Canadian small business owners, advisors and professionals on SMB Hub.", path: "/members" });

const SIZE = 18;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q = "", type = "", page: p } = await searchParams;
  const page = Number(p) || 1;
  const { supabase, userId } = await getViewer();

  // with a search term, the best matches come first; otherwise the newest members do
  const fts = ftsQuery(q);
  const fields = "id, full_name, headline, avatar_url, member_type, location";
  let query = fts
    ? supabase.rpc("search_profiles", { q: fts }).select(fields)
    : supabase.from("profiles").select(fields).order("created_at", { ascending: false });
  if (type in MEMBER_TYPES) query = query.eq("member_type", type);
  const [{ data }, links] = await Promise.all([query.range((page - 1) * SIZE, page * SIZE - 1), getLinks()]);
  const rows = (data ?? []) as Person[];
  const members = rows.filter((m) => m.id !== userId);
  const degrees = await getDegrees(supabase, userId, members.map((m) => m.id));

  const base = `/members?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`;
  return (
    <>
      <PageTitle title="Members" />
      <form className="panel flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search by name, headline or city" aria-label="Search members" className="field min-w-[180px] flex-1" />
        <select name="type" defaultValue={type} aria-label="Member type" className="rounded-lg border border-input bg-white px-3 text-sm">
          <option value="">All members</option>
          {Object.entries(MEMBER_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <SubmitButton>Search</SubmitButton>
      </form>

      {members.length === 0 && <Empty title="No members match that search">Try a different name or clear the filters.</Empty>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {members.map((m) => (
          <PersonCard key={m.id} person={m} link={links.get(m.id) ?? "none"} signedIn={!!userId} degree={degrees.get(m.id)} />
        ))}
      </div>
      <Pager page={page} hasMore={rows.length === SIZE} base={base} />
    </>
  );
}
