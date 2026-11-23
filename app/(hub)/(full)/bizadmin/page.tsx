import Link from "next/link";
import { timeAgo } from "@/lib/hub";
import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { SettingsForm } from "@/components/zip/settings-ui";
import { BizCategoriesBody, BizSettingsBody } from "@/components/zip/settings-pages";
import { getBusinessSettings } from "@/lib/business-server";
import { decideBusiness, decideClaim, decideReview } from "@/app/(hub)/business-actions";
import { saveBizSettings } from "@/app/(hub)/team-actions";
import { STATUS_LABEL } from "@/lib/business";

export const metadata = { title: "Business Profiles", robots: { index: false } };

type P = { id: string; slug: string; name: string; category: string; city: string; province: string; updated_at: string; status?: string; owner: { full_name: string } | null };
type C = { id: string; evidence: string; created_at: string; company: { name: string } | null; claimant: { full_name: string } | null };
type R = { company_id: string; author_id: string; rating: number; body: string; company: { name: string } | null; author: { full_name: string } | null };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

function Queue({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  return (
    <div className="card"><div className="row"><h2 className="grow">{title}</h2><span className={`pill ${n ? "warn" : "on"}`}>{n}</span></div>
      {n ? <div className="list">{children}</div> : <p className="muted">Nothing waiting.</p>}</div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, gate } = await teamViewer("Business Profiles");
  if (gate) return gate;
  const sp = await searchParams;
  const tab = ["queues", "all", "cats", "settings"].includes(first(sp.tab)) ? first(sp.tab) : "queues";
  const settings = await getBusinessSettings();
  const [pendRes, claimRes, revRes, allRes] = await Promise.all([
    supabase.from("companies").select("id, slug, name, category, city, province, updated_at, owner:profiles!companies_owner_id_fkey(full_name)").eq("status", "pending").order("updated_at"),
    supabase.from("business_claims").select("id, evidence, created_at, company:companies!business_claims_company_id_fkey(name), claimant:profiles!business_claims_user_id_fkey(full_name)").eq("status", "pending").order("created_at"),
    supabase.from("company_reviews").select("company_id, author_id, rating, body, company:companies!company_reviews_company_id_fkey(name), author:profiles!company_reviews_author_id_fkey(full_name)").eq("status", "pending").order("created_at"),
    supabase.from("companies").select("id, slug, name, category, city, province, updated_at, status, owner:profiles!companies_owner_id_fkey(full_name)").neq("status", "deleted").order("name").limit(500),
  ]);
  const pend = (pendRes.data ?? []) as unknown as P[];
  const claims = (claimRes.data ?? []) as unknown as C[];
  const revs = (revRes.data ?? []) as unknown as R[];
  const all = (allRes.data ?? []) as unknown as P[];
  const counts: Record<string, number> = {};
  for (const b of all) if (b.status === "published") counts[b.category] = (counts[b.category] ?? 0) + 1;
  const open = pend.length + claims.length + revs.length;
  const tabs: [string, string][] = [["queues", `Queues (${open})`], ["all", "All businesses"], ["cats", "Categories"], ["settings", "Settings"]];
  const initial = { create: settings.create_mode, limit: String(settings.member_limit), pubApproval: settings.pub_approval, revApproval: settings.review_approval, criteria: settings.criteria, cats: settings.categories, tabs: settings.tabs };

  return (
    <TeamWrap>
      <TeamHead title="Business Profiles" text="Review new listings, claims, reviews and reports. Manage categories and the rules for business pages." />
      <div className="autabs" role="tablist">
        {tabs.map(([k, l]) => <Link key={k} role="tab" className="chip" aria-selected={tab === k} aria-current={tab === k ? "page" : undefined} href={`/bizadmin?tab=${k}`}>{l}</Link>)}
      </div>

      {tab === "queues" && (
        <div className="setgrid">
          <Queue title="New listings" n={pend.length}>{pend.map((b) => (
            <div className="stack" style={{ gap: 6 }} key={b.id}>
              <div className="row"><span className="stack grow" style={{ gap: 1 }}><strong>{b.name}</strong><span className="muted small">{b.category} · {b.city}, {b.province}{b.owner ? ` · by ${b.owner.full_name}` : ""} · {timeAgo(b.updated_at)}</span></span></div>
              <span className="small">Needs a decision: publish this page?</span>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <Link className="btn sm ghost" href={`/businesses/${b.slug}`}>Preview</Link>
                <form action={decideBusiness.bind(null, b.id, true)}><button className="btn sm">Publish</button></form>
                <form action={decideBusiness.bind(null, b.id, false)}><button className="btn sm ghost">Reject</button></form>
              </div></div>))}</Queue>
          <Queue title="Ownership claims" n={claims.length}>{claims.map((c) => (
            <div className="stack" style={{ gap: 6 }} key={c.id}>
              <span className="stack" style={{ gap: 1 }}><strong>{c.company?.name}</strong><span className="muted small">Claimed by {c.claimant?.full_name} · {timeAgo(c.created_at)}</span></span>
              <div className="bzevid small"><strong>Private evidence</strong><br />{c.evidence}</div>
              <span className="small">Needs a decision: give {c.claimant?.full_name.split(" ")[0]} ownership? Followers, posts, reviews and the page address stay.</span>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <form action={decideClaim.bind(null, c.id, true)}><button className="btn sm">Approve claim</button></form>
                <form action={decideClaim.bind(null, c.id, false)}><button className="btn sm ghost">Reject</button></form>
              </div></div>))}</Queue>
          <Queue title="Reviews waiting" n={revs.length}>{revs.map((r) => (
            <div className="stack" style={{ gap: 6 }} key={`${r.company_id}${r.author_id}`}>
              <span><strong>{r.company?.name}</strong> <span className="muted small">· review by {r.author?.full_name}</span></span>
              <span aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span>
              {r.body && <span className="small">{r.body}</span>}
              <span className="small">Needs a decision: publish this review? It does not count toward the rating until it is published.</span>
              <div className="row">
                <form action={decideReview.bind(null, r.company_id, r.author_id, true)}><button className="btn sm">Publish</button></form>
                <form action={decideReview.bind(null, r.company_id, r.author_id, false)}><button className="btn sm ghost">Reject</button></form>
              </div></div>))}</Queue>
          <Queue title="Reports" n={0}>{null}</Queue>
        </div>
      )}

      {tab === "all" && (
        <div className="card"><div className="row"><h2 className="grow">All businesses</h2><span className="muted small">Turn optional tabs on or off for every business in Settings.</span></div>
          <div className="ftable">{all.length ? all.map((b) => (
            <div className="frow2" key={b.id} style={{ flexWrap: "wrap" }}>
              <span className="stack" style={{ gap: 1, flex: "1 1 200px" }}>
                {b.status === "published" ? <Link href={`/businesses/${b.slug}`}><strong>{b.name}</strong></Link> : <strong>{b.name}</strong>}
                <span className="muted small">{STATUS_LABEL[b.status ?? ""] ?? b.status} · {b.owner ? `owner ${b.owner.full_name}` : "unclaimed"}</span></span>
              <span className="muted small">{b.category}{b.city ? ` · ${b.city}, ${b.province}` : ""}</span></div>)) : <p className="muted">No businesses yet.</p>}</div></div>
      )}

      {tab === "cats" && <SettingsForm pageKey="bizadmin" initial={initial} save={saveBizSettings}><BizCategoriesBody counts={counts} /></SettingsForm>}
      {tab === "settings" && <SettingsForm pageKey="bizadmin" initial={initial} save={saveBizSettings}><BizSettingsBody /></SettingsForm>}
    </TeamWrap>
  );
}
