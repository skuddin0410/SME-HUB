import { getMe, MEMBER_TYPES, type Profile } from "@/lib/hub";
import { Empty, fieldClass, Pager, PersonLine } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SIZE = 20;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q = "", type = "", page: p } = await searchParams;
  const page = Number(p) || 1;
  const { supabase } = await getMe();

  let query = supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, member_type, location")
    .order("created_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  // strip characters that have meaning in the filter syntax before searching
  const term = q.replace(/[%,()]/g, " ").trim();
  if (term) query = query.or(`full_name.ilike.%${term}%,headline.ilike.%${term}%`);
  if (type in MEMBER_TYPES) query = query.eq("member_type", type);
  const { data } = await query;
  const members = (data ?? []) as (Profile & { location: string })[];

  const base = `/members?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`;
  return (
    <>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search members by name or headline" className={fieldClass} />
        <select name="type" defaultValue={type} className="rounded-md border bg-background px-2 text-sm">
          <option value="">All types</option>
          {Object.entries(MEMBER_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="h-auto">
          Search
        </Button>
      </form>
      {members.length === 0 && <Empty>No members found.</Empty>}
      {members.map((m) => (
        <Card key={m.id} className="p-4">
          <PersonLine person={m} extra={[m.headline, m.location].filter(Boolean).join(" · ") || "Member"} />
        </Card>
      ))}
      <Pager page={page} hasMore={members.length === SIZE} base={base} />
    </>
  );
}
