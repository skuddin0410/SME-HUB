import { timeAgo } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { CFG_DEFAULT } from "@/lib/safety/server";
import { BlockSiteForm, HeldActions, JobTeamActions, SafetyRules, UnblockSite, WatchActions } from "./team-client";

/** Update 41: the team's safety tools inside Moderation (overview row and four tabs), all from the database. */

type DB = { from: (t: string) => any; rpc: (f: string, a?: Record<string, unknown>) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Who = { id: string; full_name: string; headline: string | null; avatar_url: string | null } | null;
type Overview = { held: number; held_oldest: string | null; tries: number; joined: number; blocked: number; reasons: [string, number][]; links_blocked: number; links_checked: number } | null;

export const SAFETY_TABS: [string, string, string][] = [["held", "Held for review", "flag"], ["signups", "Sign-ups", "users"], ["links", "Links", "link"], ["safety", "Safety rules", "lock"]];

export async function safetyOverview(supabase: DB): Promise<Overview> {
  const { data } = await supabase.rpc("safety_overview");
  return (data as Overview) ?? null;
}

const n = (v: number) => v.toLocaleString("en-CA");

export function SafetyKpis({ o, reports }: { o: Overview; reports: number }) {
  const held = o?.held ?? 0;
  return (
    <div className="sfkpis">
      <div className={held ? "warn" : ""}><small>Held for review</small><b>{n(held)}</b><span>{held && o?.held_oldest ? `Oldest: ${timeAgo(o.held_oldest)}` : "All clear"}</span></div>
      <div><small>Reports waiting</small><b>{n(reports)}</b><span>Goal: answer within 24 hours</span></div>
      <div><small>Bot sign-ups blocked</small><b>{n(o?.blocked ?? 0)}</b><span>last 7 days, of {n(o?.tries ?? 0)} tries</span></div>
      <div><small>Dangerous links blocked</small><b>{n(o?.links_blocked ?? 0)}</b><span>last 7 days, {n(o?.links_checked ?? 0)} checked</span></div>
    </div>
  );
}

function WhoLine({ m }: { m: Who }) {
  return (
    <span className="sfwho">
      <ZipAv name={m?.full_name || "Member"} src={m?.avatar_url} size="s" />
      <span><b>{m?.full_name || "A member"}</b><small>{m?.headline ?? ""}</small></span>
    </span>
  );
}

export async function HeldPanel({ supabase }: { supabase: DB }) {
  const { data } = await supabase
    .from("held_items")
    .select("id, kind, body, where_label, reasons, created_at, author:profiles!held_items_author_id_fkey(id, full_name, headline, avatar_url)")
    .is("decided_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const H = (data ?? []) as { id: string; kind: string; body: string; where_label: string; reasons: string[]; created_at: string; author: Who }[];
  // Update 43: a new business page's first job waits here too
  const { data: hj } = await supabase.from("jobs").select("id, title, description, created_at, company:companies!jobs_company_id_fkey(name, created_at), poster:profiles!jobs_posted_by_fkey(id, full_name, headline, avatar_url)").eq("status", "held").order("created_at").limit(50);
  const J = (hj ?? []) as { id: string; title: string; description: string; created_at: string; company: { name: string; created_at: string } | null; poster: Who }[];
  if (!H.length && !J.length) {
    return (
      <div className="sfpanel sfempty">
        <Ic n="check" s={20} />
        <b>Nothing held right now</b>
        <span>Posts, comments and messages caught by the automatic checks show up here before anyone sees them.</span>
      </div>
    );
  }
  return (
    <div className="sfpanel">
      <p className="sfmut">The automatic checks stopped these before members saw them. Nothing is published until you approve it.</p>
      <div className="sflist">
        {J.map((j) => (
          <article className="sfitem" key={j.id}>
            <div className="sfith"><WhoLine m={j.poster} /><span className="sftag">Job</span><small>{j.company?.name ?? ""} · {timeAgo(j.created_at)}</small></div>
            <p className="sftext"><b>{j.title}</b> · {j.description.slice(0, 400)}</p>
            <div className="sfwhy"><span><Ic n="flag" s={12} />First job from a new business page</span></div>
            <JobTeamActions id={j.id} held />
          </article>
        ))}
        {H.map((h) => (
          <article className="sfitem" key={h.id}>
            <div className="sfith">
              <WhoLine m={h.author} />
              <span className="sftag">{h.kind === "message" ? "Message" : h.kind === "comment" ? "Comment" : "Post"}</span>
              <small>{h.where_label ? `${h.where_label} · ` : ""}{timeAgo(h.created_at)}</small>
            </div>
            <p className="sftext">{h.body}</p>
            <div className="sfwhy">{h.reasons.map((w) => <span key={w}><Ic n="flag" s={12} />{w}</span>)}</div>
            <HeldActions id={h.id} />
          </article>
        ))}
      </div>
    </div>
  );
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit", hour12: false });

export async function SignupsPanel({ supabase, o }: { supabase: DB; o: Overview }) {
  const [{ data: rows }, { data: watch }] = await Promise.all([
    supabase.from("signup_log").select("id, at, email_masked, outcome, reason, country").order("at", { ascending: false }).limit(20),
    supabase.rpc("safety_watch"),
  ]);
  const R = (rows ?? []) as { id: number; at: string; email_masked: string; outcome: string; reason: string }[];
  const W = (watch ?? []) as { id: string; full_name: string; headline: string | null; avatar_url: string | null; why: string }[];
  const reasons = o?.reasons ?? [];
  const top = Math.max(1, ...reasons.map((r) => r[1]));
  return (
    <div className="sfpanel">
      <div className="sfmini">
        <div><b>{n(o?.tries ?? 0)}</b><small>Tried to join (7 days)</small></div>
        <div><b>{n(o?.joined ?? 0)}</b><small>Joined</small></div>
        <div><b>{n(o?.blocked ?? 0)}</b><small>Blocked</small></div>
      </div>
      {reasons.length > 0 && (
        <div className="sfreasons">
          {reasons.map(([r, c]) => (
            <div key={r}><span>{r}</span><span className="sfrb"><i style={{ width: `${Math.round((c / top) * 100)}%` }} /></span><b>{c}</b></div>
          ))}
        </div>
      )}
      <h3 className="sfh3">Latest tries</h3>
      {R.length ? (
        <div className="sftable" role="table" aria-label="Latest sign-up tries">
          <div className="sftr sfth" role="row"><span role="columnheader">Time</span><span role="columnheader">Email</span><span role="columnheader">Result</span><span role="columnheader">Why</span></div>
          {R.map((r) => (
            <div className="sftr" role="row" key={r.id}>
              <span role="cell">{hhmm(r.at)}</span>
              <span role="cell">{r.email_masked || "—"}</span>
              <span role="cell"><span className={`sfpill ${r.outcome === "allowed" ? "ok" : "no"}`}>{r.outcome === "allowed" ? "Allowed" : "Blocked"}</span></span>
              <span role="cell">{r.reason || "Passed every check"}</span>
            </div>
          ))}
        </div>
      ) : <p className="sfmut">No sign-ups yet.</p>}
      <h3 className="sfh3">Joined, but worth watching</h3>
      {W.map((w) => (
        <div className="sfwatch" key={w.id}>
          <WhoLine m={w} />
          <small>{w.why}</small>
          <WatchActions id={w.id} />
        </div>
      ))}
      {!W.length && <p className="sfmut">Nobody to watch right now.</p>}
    </div>
  );
}

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto", month: "short", day: "numeric" });

export async function LinksPanel({ supabase }: { supabase: DB }) {
  const [{ data: b }, { data: a }] = await Promise.all([
    supabase.from("blocked_sites").select("domain, why, seen, created_at, adder:profiles!blocked_sites_added_by_fkey(full_name)").order("created_at", { ascending: false }).limit(500),
    supabase.from("allowed_sites").select("domain").order("domain"),
  ]);
  const B = (b ?? []) as { domain: string; why: string; seen: number; created_at: string; adder: { full_name: string } | null }[];
  return (
    <div className="sfpanel">
      <p className="sfmut">Every link in posts, comments, messages and business pages is checked against Google Web Risk and the list below. Members see a warning before they leave SME Hub.</p>
      <h3 className="sfh3">Blocked sites</h3>
      <div className="sftable" role="table" aria-label="Blocked sites">
        <div className="sftr sfth sf5" role="row"><span role="columnheader">Site</span><span role="columnheader">Why</span><span role="columnheader">Added by</span><span role="columnheader">Times seen</span><span role="columnheader"><span className="sr">Actions</span></span></div>
        {B.map((x) => (
          <div className="sftr sf5" role="row" key={x.domain}>
            <span role="cell"><b>{x.domain}</b></span>
            <span role="cell">{x.why}</span>
            <span role="cell">{x.adder ? "Hub team" : "Automatic"} · {day(x.created_at)}</span>
            <span role="cell">{x.seen}</span>
            <span role="cell"><UnblockSite domain={x.domain} /></span>
          </div>
        ))}
        {!B.length && <div className="sftr" role="row"><span role="cell" style={{ gridColumn: "1 / -1" }}>No sites blocked yet. Look-alikes of smehub.ca and canadiansme.ca are always blocked.</span></div>}
      </div>
      <BlockSiteForm />
      <h3 className="sfh3">Always allowed</h3>
      <p className="sfmut sm">Trusted sites that are never blocked, such as government and partner sites.</p>
      <div className="sfchips">{((a ?? []) as { domain: string }[]).map((x) => <span key={x.domain}>{x.domain}</span>)}</div>
    </div>
  );
}

export async function RulesPanel({ supabase }: { supabase: DB }) {
  const { data } = await supabase.from("safety_config").select("cfg, words, names").eq("id", 1).maybeSingle();
  const row = data as { cfg: Record<string, boolean | number>; words: string[]; names: string[] } | null;
  return <SafetyRules cfg={{ ...CFG_DEFAULT, ...(row?.cfg ?? {}) }} words={row?.words ?? []} names={row?.names ?? []} />;
}

/** Update 43: jobs members reported ("asks for money", fake ads). */
export async function ReportedJobs({ supabase }: { supabase: DB }) {
  const { data, error } = await supabase.from("job_reports").select("job_id, reason, created_at, job:jobs!job_reports_job_id_fkey(id, title, status, company:companies!jobs_company_id_fkey(name))").eq("status", "open").order("created_at", { ascending: false }).limit(200);
  if (error) return null;
  const by = new Map<string, { title: string; company: string; n: number; reason: string; held: boolean }>();
  for (const r of (data ?? []) as unknown as { job_id: string; reason: string; job: { id: string; title: string; status: string; company: { name: string } | null } | null }[]) {
    if (!r.job || r.job.status === "removed") continue;
    const x = by.get(r.job_id) ?? { title: r.job.title, company: r.job.company?.name ?? "", n: 0, reason: r.reason, held: r.job.status === "held" };
    x.n += 1;
    by.set(r.job_id, x);
  }
  if (!by.size) return null;
  return (
    <div className="card">
      <div className="row"><h2 className="grow">Reported jobs</h2><span className="pill warn">{by.size} waiting</span></div>
      <div className="list">
        {[...by.entries()].map(([id, x]) => (
          <div key={id} className="row" style={{ flexWrap: "wrap" }}>
            <span className="stack grow"><a className="namebtn" href={`/jobs/${id}`}><strong>{x.title}</strong></a><span className="muted small">{x.company} · {x.n} report{x.n === 1 ? "" : "s"} · {x.reason}</span></span>
            <JobTeamActions id={id} held={x.held} />
          </div>
        ))}
      </div>
    </div>
  );
}
