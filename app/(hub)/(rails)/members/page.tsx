import { getDegrees, getLinks, getViewer } from "@/lib/hub";
import { Empty, PageTitle, Pager } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { PersonCard, type Person } from "@/components/network-client";
import { pageMeta } from "@/lib/seo";
import { AVAILABILITY, PROFILE_TYPES, PROVINCES } from "@/lib/profile-extra";

export const metadata = pageMeta({ title: "Members", description: "Meet Canadian small business owners, advisors and professionals on SMB Hub.", path: "/members" });

const SIZE = 18;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type Row = { id: string; full_name: string; headline: string; location: string; avatar_url: string | null; profile_type: string; helps_with: string[] };

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const type = one(sp.type);
  const province = one(sp.province);
  const help = one(sp.help).trim().slice(0, 60);
  const avail = one(sp.avail);
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const { supabase, userId } = await getViewer();

  // the database applies each member's privacy choices, accents and case do not matter
  const { data } = await supabase.rpc("search_members", {
    q,
    p_type: type in PROFILE_TYPES ? type : null,
    p_province: (PROVINCES as readonly string[]).includes(province) ? province : null,
    p_help: help || null,
    p_avail: (AVAILABILITY as readonly string[]).includes(avail) ? avail : null,
    p_limit: SIZE,
    p_offset: (page - 1) * SIZE,
  });
  const rows = (data ?? []) as Row[];
  const tiers = rows.length ? ((await supabase.from("profiles").select("id, member_type").in("id", rows.map((r) => r.id))).data ?? []) : [];
  const tier = new Map(tiers.map((t) => [t.id as string, t.member_type as Person["member_type"]]));
  const members: Person[] = rows.filter((m) => m.id !== userId).map((m) => ({ ...m, member_type: tier.get(m.id) ?? "owner" }));
  const [links, degrees] = await Promise.all([getLinks(), getDegrees(supabase, userId, members.map((m) => m.id))]);

  const qs = new URLSearchParams({ q, type, province, help, avail }).toString();
  const select = "rounded-lg border border-input bg-white px-3 text-sm";
  return (
    <>
      <PageTitle title="Members" />
      <form className="panel grid gap-2 p-3 sm:grid-cols-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search by name, headline or city" aria-label="Search members" className="field sm:col-span-2" />
        <select name="type" defaultValue={type} aria-label="Type of member" className={select}>
          <option value="">All types</option>
          {Object.entries(PROFILE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select name="province" defaultValue={province} aria-label="Province" className={select}>
          <option value="">All of Canada</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input name="help" defaultValue={help} placeholder="Can help with, e.g. Wholesale" aria-label="Can help with" className="field" />
        <select name="avail" defaultValue={avail} aria-label="Availability" className={select}>
          <option value="">Any time</option>
          {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <SubmitButton className="sm:col-span-2">Search</SubmitButton>
      </form>

      {members.length === 0 && <Empty title="No members match that search">Try a different name or clear the filters.</Empty>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {members.map((m) => (
          <PersonCard key={m.id} person={m} link={links.get(m.id) ?? "none"} signedIn={!!userId} degree={degrees.get(m.id)} />
        ))}
      </div>
      <Pager page={page} hasMore={rows.length === SIZE} base={`/members?${qs}`} />
    </>
  );
}
