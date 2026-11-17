import Link from "next/link";
import { cleanTerm, getViewer, MEMBER_TYPES, type Profile } from "@/lib/hub";
import { ConnectControl, Empty, PageTitle, Pager, TierBadge, type Link_ } from "@/components/hub";
import { AvatarImg, Cover, SubmitButton } from "@/components/hub-client";

const SIZE = 18;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
  const { q = "", type = "", page: p } = await searchParams;
  const page = Number(p) || 1;
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  let query = supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, member_type, location")
    .order("created_at", { ascending: false })
    .range((page - 1) * SIZE, page * SIZE - 1);
  const term = cleanTerm(q);
  if (term) query = query.or(`full_name.ilike.%${term}%,headline.ilike.%${term}%,location.ilike.%${term}%`);
  if (type in MEMBER_TYPES) query = query.eq("member_type", type);
  const { data } = await query;
  const members = (data ?? []) as Profile[];

  // where the viewer stands with each listed member
  const links = new Map<string, Link_>();
  if (userId && members.length) {
    const { data: rows } = await supabase.from("connections").select("requester_id, addressee_id, status");
    for (const r of rows ?? []) {
      links.set(r.requester_id === userId ? r.addressee_id : r.requester_id, r as NonNullable<Link_>);
    }
  }

  const base = `/members?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}`;
  return (
    <>
      <PageTitle title="Members" />
      <form className="panel flex flex-wrap gap-2 p-3">
        <input name="q" defaultValue={q} placeholder="Search by name, headline or city" aria-label="Search members" className="field min-w-[180px] flex-1" />
        <select name="type" defaultValue={type} aria-label="Member type" className="rounded-xl border border-input bg-white px-3 text-sm">
          <option value="">All members</option>
          {Object.entries(MEMBER_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <SubmitButton tone="dark">Search</SubmitButton>
      </form>

      {members.length === 0 && <Empty title="No members match that search">Try a different name or clear the filters.</Empty>}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2">
        {members.map((m) => (
          <div key={m.id} className="panel flex flex-col items-center lift overflow-hidden text-center">
            <Cover seed={m.id} className="h-16" />
            <Link href={`/members/${m.id}`} className="relative -mt-10 rounded-full ring-4 ring-white">
              <AvatarImg person={m} size={80} />
            </Link>
            <div className="flex flex-1 flex-col items-center gap-1 px-4 pb-4 pt-2">
              <Link href={`/members/${m.id}`} className="font-semibold leading-tight hover:underline">
                {m.full_name || "Member"}
              </Link>
              <TierBadge type={m.member_type} />
              <p className="line-clamp-2 text-[13px] text-muted-foreground">{m.headline || "CanadianSME Hub member"}</p>
              {m.location && <p className="text-xs text-muted-foreground">{m.location}</p>}
              <div className="mt-auto pt-3">
                <ConnectControl viewer={viewer} otherId={m.id} link={links.get(m.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <Pager page={page} hasMore={members.length === SIZE} base={base} />
    </>
  );
}
