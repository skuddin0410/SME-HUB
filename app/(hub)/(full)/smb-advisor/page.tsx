import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { ZipAv } from "@/components/zip/bits";
import { ZipStars } from "@/components/zip/biz-client";
import { LiveForm } from "@/components/zip/live-form";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({
  title: "SME Advisors",
  description: "Experienced advisors who serve Canadian small businesses: accountants, lawyers, consultants and coaches on SME Hub.",
  path: "/smb-advisor",
});

type Row = {
  id: string; full_name: string | null; headline: string | null; avatar_url: string | null; location: string | null;
  advisor_profiles: { field: string; years: number; helped: number; rating: number | null; about: string; services: { name: string; text: string }[] } | { field: string; years: number; helped: number; rating: number | null; about: string; services: { name: string; text: string }[] }[] | null;
};

/** Members on the SME Advisor plan, with what the plan includes. */
export default async function SmbAdvisorPage({ searchParams }: { searchParams: Promise<{ q?: string; field?: string }> }) {
  const sp = await searchParams;
  const { supabase, userId } = await getViewer();
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} '-]/gu, "").slice(0, 60).toLowerCase();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, location, advisor_profiles(field, years, helped, rating, about, services)")
    .eq("member_type", "advisor")
    .order("created_at", { ascending: true })
    .limit(100);
  const all = ((data ?? []) as unknown as Row[]).map((r) => ({ ...r, ap: Array.isArray(r.advisor_profiles) ? r.advisor_profiles[0] ?? null : r.advisor_profiles }));
  const fields = [...new Set(all.map((a) => a.ap?.field).filter((f): f is string => !!f))].sort();
  const field = fields.includes(sp.field ?? "") ? sp.field! : "";
  const list = all.filter((a) => {
    if (field && a.ap?.field !== field) return false;
    if (!q) return true;
    const hay = [a.full_name, a.headline, a.location, a.ap?.field, ...(a.ap?.services ?? []).map((s) => s.name)].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const href = (f: string) => `/smb-advisor${f || q ? "?" : ""}${[f && `field=${encodeURIComponent(f)}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join("&")}`;

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <p className="eyebrow">Explore the Hub</p>
          <h1>SME Advisors</h1>
          <p className="muted">Accountants, lawyers, consultants and coaches who work with Canadian small businesses. Open a profile to see their services, reviews and free call times.</p>
        </div>
        <LiveForm className="tools" role="search">
          <label className="sr" htmlFor="adq">Search advisors</label>
          <input id="adq" name="q" className="field" type="search" placeholder="Search by name or topic, such as lease or payroll" defaultValue={q} />
          {field && <input type="hidden" name="field" value={field} />}
        </LiveForm>
        <nav className="chips" aria-label="Expertise" style={{ margin: "12px 0 14px" }}>
          <Link className="chip" href={href("")} aria-current={!field ? "true" : undefined}>All ({all.length})</Link>
          {fields.map((f) => (
            <Link key={f} className="chip" href={href(f)} aria-current={field === f ? "true" : undefined}>{f}</Link>
          ))}
        </nav>

        {list.length ? (
          <div className="advlist">
            {list.map((m) => {
              const a = m.ap;
              return (
                <div key={m.id} className="card advrow">
                  <ZipAv name={m.full_name || "Advisor"} src={m.avatar_url} size="l" />
                  <div className="stack grow" style={{ flexBasis: 300, gap: 6 }}>
                    <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                      <Link className="namebtn" style={{ font: "700 17px var(--display)" }} href={`/members/${m.id}`}>{m.full_name || "Advisor"}</Link>
                      <span className="tag">SME Advisor</span>
                      {a?.field && <span className="tag">{a.field}</span>}
                    </div>
                    <span className="muted">{[m.headline, m.location].filter(Boolean).join(" · ")}</span>
                    {a && a.rating != null && (
                      <span className="small">
                        <ZipStars value={Number(a.rating)} /> <b>{Number(a.rating).toFixed(1)}</b> · {a.helped} members helped · {a.years} years of experience
                      </span>
                    )}
                    {a?.about && <p className="small">{a.about}</p>}
                    {a && a.services.length > 0 && (
                      <div className="chips">
                        {a.services.map((s) => <span key={s.name} className="tag offer">{s.name}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    <Link className="btn sm" href={`/members/${m.id}`}>View full profile</Link>
                    <Link className="btn sm ghost" href={userId ? `/messages?with=${m.id}` : "/auth/sign-up"}>Ask a question</Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card"><strong>{all.length ? "No advisors match." : "No advisors listed yet."}</strong><p className="muted">{all.length ? "Try another topic." : "Advisors appear here once they join the SME Advisor plan."}</p></div>
        )}

        <div className="card doc" style={{ marginTop: 14 }}>
          <h2>Become an SME Advisor</h2>
          <p className="lead">For experts who serve small businesses. The plan includes an SME Advisor badge on your profile and posts, and:</p>
          <div className="feat">
            <div><strong>A national network</strong><span className="muted small">Reach owners across Canada and build a client base.</span></div>
            <div><strong>Host events and courses</strong><span className="muted small">Run sessions for members and sell your courses on the Hub.</span></div>
            <div><strong>Podcast and advertorial</strong><span className="muted small">An interview on the Small Business Podcast and a CanadianSME feature.</span></div>
            <div><strong>AI leads</strong><span className="muted small">See members who ask about your specialty.</span></div>
          </div>
          <Link className="btn" href="/membership-plans" style={{ alignSelf: "flex-start" }}>See the Advisor plan</Link>
        </div>
      </div>
    </div>
  );
}
