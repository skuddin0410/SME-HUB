import Link from "next/link";
import { getLinks, getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { LiveForm } from "@/components/zip/live-form";
import { DirectoryBody, type DirMember } from "@/components/zip/directory-client";
import { TYPES } from "@/lib/zip/types";
import { AVAILABILITY, PROFILE_TYPES, PROVINCES } from "@/lib/profile-extra";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const PNAME: Record<string, string> = { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon" };

type Row = {
  id: string; full_name: string; headline: string; location: string; avatar_url: string | null; profile_type: string; member_type?: string;
  founding_number: number | null; helps_with: string[]; needs?: string[]; recommended_by?: number; last_active?: string | null;
};

function activity(at: string | null | undefined): { label: string; today: boolean } {
  if (!at) return { label: "", today: false };
  const days = (Date.now() - new Date(at).getTime()) / 86_400_000;
  if (days < 1) return { label: "Active today", today: true };
  if (days < 7) return { label: "Active this week", today: false };
  if (days < 31) return { label: "Active this month", today: false };
  return { label: "Active earlier", today: false };
}

/** The guide's "Member directory": search and filters on the left, cards below, the map and the chosen member on the right. */
export async function Directory({ searchParams, base }: { searchParams: Record<string, string | string[] | undefined>; base: string }) {
  const q = one(searchParams.q).slice(0, 80);
  const province = one(searchParams.province);
  const type = one(searchParams.type);
  const sort = one(searchParams.sort) === "name" ? "name" : "active";
  const plan = one(searchParams.plan);
  const help = one(searchParams.help).trim().slice(0, 60);
  const avail = one(searchParams.avail);
  const founding = one(searchParams.founding) === "1";
  const { supabase, userId } = await getViewer();

  const args = {
    q,
    p_type: type in PROFILE_TYPES ? type : null,
    p_province: (PROVINCES as readonly string[]).includes(province) ? province : null,
    p_help: help || null,
    p_avail: (AVAILABILITY as readonly string[]).includes(avail) ? avail : null,
    p_limit: 100,
    p_offset: 0,
  };
  // member_directory adds each card's extra lines; until that migration is applied the older search still fills the cards
  let res = await supabase.rpc("member_directory", args);
  if (res.error) res = await supabase.rpc("search_members", args);
  let rows = ((res.data ?? []) as Row[]).filter((r) => r.id !== userId);
  if (!res.error && rows.length && rows[0].member_type === undefined) {
    const t = await supabase.from("profiles").select("id, member_type").in("id", rows.map((r) => r.id));
    const tier = new Map((t.data ?? []).map((x) => [x.id as string, x.member_type as string]));
    rows = rows.map((r) => ({ ...r, member_type: tier.get(r.id) ?? "owner" }));
  }
  if (plan === "advisor") rows = rows.filter((r) => r.member_type === "advisor");
  else if (plan === "plus") rows = rows.filter((r) => r.member_type === "plus" || r.member_type === "elite");
  else if (plan === "free") rows = rows.filter((r) => r.member_type === "owner");
  if (founding) rows = rows.filter((r) => r.founding_number != null);

  const members: DirMember[] = rows.map((r) => {
    const a = activity(r.last_active);
    return { id: r.id, name: r.full_name, headline: r.headline, city: r.location, avatar: r.avatar_url, type: r.profile_type, recs: r.recommended_by ?? 0, active: a.label, today: a.today, helps: r.helps_with ?? [], needs: r.needs ?? [] };
  });
  if (sort === "active") {
    const rank = (m: DirMember) => (m.today ? 0 : m.active === "Active this week" ? 1 : m.active === "Active this month" ? 2 : 3);
    members.sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name));
  } else members.sort((x, y) => x.name.localeCompare(y.name));

  const links = await getLinks();
  const follows = userId && members.length ? ((await supabase.from("follows").select("followee_id").eq("follower_id", userId).in("followee_id", members.map((m) => m.id))).data ?? []).map((f) => f.followee_id as string) : [];
  const nf = (plan ? 1 : 0) + (founding ? 1 : 0) + (help ? 1 : 0) + (avail ? 1 : 0);
  const filtered = nf > 0 || q || province || type;

  const form = (
    <LiveForm className="stack" role="search">
      <div className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="sort" value={sort} />
        <div className="dirtools">
          <label className="sr" htmlFor="pq">Search members</label>
          <input id="pq" name="q" className="field" type="search" placeholder="Name, business or skill, such as payroll" defaultValue={q} />
          <label className="sr" htmlFor="prov">Location</label>
          <select id="prov" name="province" className="field" style={{ flex: "0 1 170px" }} defaultValue={province}>
            <option value="">All of Canada</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{PNAME[p] ?? p}</option>)}
          </select>
          <label className="sr" htmlFor="ptype">Profile type</label>
          <select id="ptype" name="type" className="field" style={{ flex: "0 1 170px" }} defaultValue={type}>
            <option value="">All types</option>
            {Object.keys(PROFILE_TYPES).map((t) => <option key={t} value={t}>{TYPES[t]?.[0] ?? PROFILE_TYPES[t as keyof typeof PROFILE_TYPES]}</option>)}
          </select>
          <button type="submit" className="chip" aria-pressed={nf > 0} name="more" value="1"><Ic n="filter" s={14} />Profile search{nf ? ` (${nf})` : ""}</button>
        </div>
        {(one(searchParams.more) === "1" || nf > 0) && (
          <div className="dirfilters">
            <div className="row" style={{ flexWrap: "wrap" }}>
              <label className="stack small" style={{ gap: 4, flex: "1 1 200px", fontWeight: 600 }}>Can help with
                <input name="help" className="field" defaultValue={help} placeholder="For example, Wholesale" />
              </label>
              <label className="stack small" style={{ gap: 4, flex: "1 1 200px", fontWeight: 600 }}>Availability
                <select name="avail" className="field" defaultValue={avail}>
                  <option value="">Any time</option>
                  {AVAILABILITY.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <span className="small"><strong>Membership</strong></span>
              <div className="chips">
                {[["", "Everyone"], ["advisor", "SMB Advisors"], ["plus", "Plus members"], ["free", "Free members"]].map(([v, l]) => (
                  <Link key={v} href={`${base}?${new URLSearchParams({ q, province, type, sort, help, avail, ...(v ? { plan: v } : {}), ...(founding ? { founding: "1" } : {}), more: "1" })}`} className="chip" aria-current={plan === v ? "true" : undefined}>{l}</Link>
                ))}
              </div>
            </div>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <label className="chip" style={{ cursor: "pointer" }}>
                <input type="checkbox" name="founding" value="1" defaultChecked={founding} style={{ marginRight: 6 }} />Founding Members only
              </label>
              <input type="hidden" name="plan" value={plan} />
              <button type="submit" className="btn sm">Apply</button>
              {filtered && <Link href={base} className="linkbtn">Clear all</Link>}
            </div>
          </div>
        )}
      </div>
    </LiveForm>
  );

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="dirhead">
          <p className="eyebrow">Community connections</p>
          <h1>Member directory</h1>
          <p className="muted" style={{ fontSize: 15 }}>Find the right owner by name, skill or place, then connect in one click.</p>
        </div>
        <DirectoryBody members={members} signedIn={!!userId} links={Object.fromEntries(links)} following={follows} form={form} invite={!!userId} />
      </div>
    </div>
  );
}
