import { TeamWrap, teamViewer } from "@/components/zip/team";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { ChooseBtn, FilterChips, FollowCell, TabButtons } from "@/components/ready/team-client";
import { READY_NAMES, roleParts, type ReadyKey } from "@/lib/ready-shared";
import "@/styles/profile-completion.css";

export const metadata = { title: "Profile follow-up", robots: { index: false } };

type Params = { tab?: string; f?: string };
const FILTERS: [string, string][] = [["all", "Everyone not ready"], ["founding", "Founding Members"], ["week", "Joined this week"], ["ready", "Ready now"]];
type Row = { id: string; full_name: string; avatar_url: string | null; headline: string; location: string; founding_number: number | null; created_at: string; last_visit: string | null; missing: ReadyKey[]; ready_count: number; status: string };
type Stats = { joined_7d: number; ready_7d: number; older_not_ready: number; trend: number[] };
type App = { id: string; status: string; answers: { q2?: string }; created_at: string; member: { id: string; full_name: string; avatar_url: string | null; headline: string; location: string } };

const DAY = 86_400_000;
const daysAgo = (iso: string) => Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
const joined = (iso: string) => { const d = daysAgo(iso); return d === 1 ? "1 day ago" : `${d} days ago`; };
function visit(iso: string | null) {
  if (!iso) return "Never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
}
const short = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

/** Hub team: members whose profiles are not ready, the Spotlight applications and the reminder-email rules. */
export default async function ProfileFollowPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { supabase, gate } = await teamViewer("Profile follow-up");
  if (gate) return gate;
  const tab = sp.tab === "spot" || sp.tab === "rules" ? sp.tab : "list";
  const f = FILTERS.some(([k]) => k === sp.f) ? (sp.f as string) : "all";

  const apps = (((await supabase.from("spotlight_applications").select("id, status, answers, created_at, member:profiles!spotlight_applications_member_id_fkey(id, full_name, avatar_url, headline, location)").in("status", ["received", "chosen", "published"]).order("created_at", { ascending: false }).limit(200)).data ?? []) as unknown as App[]);

  const head = (
    <div className="pagehead">
      <p className="eyebrow">Hub team</p>
      <h1>Profile follow-up</h1>
      <p className="muted" style={{ fontSize: 15, maxWidth: 760 }}>New members whose profiles aren’t ready yet. Call or message them, starting with Founding Members. A ready profile has a photo, headline, city, “Can help with” and a business page.</p>
    </div>
  );
  const tabs = <TabButtons tab={tab} count={apps.length} />;

  if (tab === "spot") {
    return (
      <TeamWrap>
        {head}{tabs}
        <div className="card">
          <p className="muted small">Only members with a ready profile can apply. Choosing a member sends them the “You’re in the Member Spotlight” message.</p>
          {apps.length === 0 && <p className="muted">No applications yet.</p>}
          {apps.map((a) => (
            <div className="row pcsprow" style={{ gap: 12, flexWrap: "wrap" }} key={a.id}>
              <ZipAv name={a.member.full_name} src={a.member.avatar_url} />
              <div className="stack grow" style={{ gap: 0, minWidth: 200 }}>
                <strong>{a.member.full_name} · {roleParts(a.member.headline)[1] || "My business"}</strong>
                <span className="small">“{(a.answers.q2 ?? "").slice(0, 60) || "—"}”</span>
                <span className="muted small">{a.member.location} · Applied {short(a.created_at)}</span>
              </div>
              {a.status !== "received" ? <span className="pill on">Chosen</span> : <ChooseBtn applicationId={a.id} memberId={a.member.id} name={a.member.full_name} />}
            </div>
          ))}
        </div>
      </TeamWrap>
    );
  }

  if (tab === "rules") {
    const R = [["Day 2", "Add your photo", "Sent if there’s no photo yet."], ["Day 5", "Your business isn’t in the Directory yet", "Sent if there’s no business page yet. Shows a preview of their draft."], ["Day 12", "People viewed your profile. Here’s what they saw", "Sent if the profile is still not ready."]];
    return (
      <TeamWrap>
        {head}{tabs}
        <div className="card">
          <h2>Profile reminder emails</h2>
          <p className="muted small">Each email asks for one missing thing. A member never gets more than these 3, and they stop as soon as the profile is ready. Members can turn them off in Email notifications.</p>
          <ol className="gslist">
            {R.map((r) => (
              <li key={r[0]}><span className="pill">{r[0]}</span><span className="stack grow" style={{ gap: 1 }}><strong>{r[1]}</strong><span className="muted small">{r[2]}</span></span></li>
            ))}
          </ol>
          <p className="muted small">These replace the single “Finish your profile” email.</p>
        </div>
      </TeamWrap>
    );
  }

  const [{ data: rowsRaw }, { data: statsRaw }] = await Promise.all([supabase.rpc("team_profile_followup", { p_filter: f }), supabase.rpc("team_profile_stats")]);
  const rows = (rowsRaw ?? []) as Row[];
  const st = ((statsRaw ?? []) as Stats[])[0] ?? { joined_7d: 0, ready_7d: 0, older_not_ready: 0, trend: [0, 0, 0, 0, 0, 0] };
  const pct = st.joined_7d ? Math.round((100 * st.ready_7d) / st.joined_7d) : 0;
  const trend = st.trend?.length ? st.trend : [0, 0, 0, 0, 0, 0];

  return (
    <TeamWrap>
      {head}{tabs}
      <div className="pcstats">
        <div className="card"><span className="muted small">Joined in the last 7 days</span><b>{st.joined_7d}</b></div>
        <div className="card"><span className="muted small">Ready within 7 days</span><b>{pct}%</b><span className="small muted">{st.ready_7d} of {st.joined_7d} · target 40%</span></div>
        <div className="card"><span className="muted small">Not ready, older than 7 days</span><b>{st.older_not_ready}</b></div>
        <div className="card pctrend">
          <span className="muted small">Ready within 7 days, last 6 weeks</span>
          <div className="pcbars" role="img" aria-label={`${trend.join(", ")} percent; target 40 percent`}>
            {trend.map((v, i) => <i key={i} style={{ height: `${v * 2}%` }} title={`${v}%`} />)}
            <span className="pctgt" style={{ bottom: "80%" }} />
          </div>
          <span className="small muted">Dashed line: 40% target</span>
        </div>
      </div>
      <div className="card">
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <FilterChips value={f} options={FILTERS} />
          <span className="muted small">{rows.length} member{rows.length === 1 ? "" : "s"}</span>
          <a className="btn sm ghost" href={`/profilefollow/export?f=${f}`} download><Ic n="down" s={14} />Export CSV</a>
        </div>
        {rows.length ? (
          <div className="pctable" role="table" aria-label="Profiles not ready">
            <div className="pctr pcth" role="row"><span role="columnheader">Member</span><span role="columnheader">Joined</span><span role="columnheader">Missing</span><span role="columnheader">Last visit</span><span role="columnheader">Follow-up</span></div>
            {rows.map((r) => (
              <div className="pctr" role="row" key={r.id}>
                <span role="cell" className="row" style={{ gap: 10, minWidth: 0 }}>
                  <ZipAv name={r.full_name} src={r.avatar_url} />
                  <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                    <strong>{r.full_name}</strong>
                    <span className="muted small">{r.headline || "No headline"}{r.location ? ` · ${r.location}` : ""}</span>
                    {r.founding_number != null && <span className="tag badge" style={{ alignSelf: "flex-start" }}>Founding Member</span>}
                  </span>
                </span>
                <span role="cell" className="small">{joined(r.created_at)}</span>
                <span role="cell"><span className="chips">{r.missing.map((k) => <span className="tag" key={k}>{READY_NAMES[k]}</span>)}</span><span className="muted small">{5 - r.missing.length} of 5 ready</span></span>
                <span role="cell" className="small">{visit(r.last_visit)}</span>
                <FollowCell id={r.id} name={r.full_name} status={r.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No members here.</p>
        )}
      </div>
    </TeamWrap>
  );
}
