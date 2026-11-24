import Link from "next/link";
import { timeAgo } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { deleteReportCategory, moderate, saveModerationSettings, saveReportCategory } from "@/app/(hub)/team-actions";

export const metadata = { title: "Moderation", robots: { index: false } };

const MTYPES: [string, string][] = [["post", "Feed posts"], ["comment", "Comments"], ["photo", "Photos"], ["group", "Groups"], ["blog", "Member blog posts"], ["blogc", "Blog comments"], ["creview", "Course reviews"]];
type Rep = { id: string; reason: string; note?: string; created_at: string; post_id: string | null; profile_id: string | null; course_review_id?: string | null; reporter: { full_name: string } | null };
type Person = { id: string; full_name: string; headline: string | null; avatar_url: string | null; status: string };
type TypeSet = Record<string, { on: boolean; auto: boolean; hide: number }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, gate } = await teamViewer("Moderation");
  if (gate) return gate;
  const tab = ["content", "stories", "members", "settings"].includes(first(sp.tab)) ? first(sp.tab) : "content";
  const cf = first(sp.cf);
  const mf = first(sp.mf);

  const [repsRes, blocksRes, settingsRes, catsRes] = await Promise.all([
    supabase.from("reports").select("id, reason, note, created_at, post_id, profile_id, course_review_id, reporter:profiles!reports_reporter_id_fkey(full_name)").eq("status", "open").order("created_at", { ascending: false }).limit(1000),
    supabase.from("blocks").select("blocked_id").limit(5000),
    supabase.from("mod_settings").select("*").maybeSingle(),
    supabase.from("report_categories").select("id, name, description, show").order("position"),
  ]);
  const reps = (repsRes.data ?? []) as unknown as Rep[];
  const postReps = new Map<string, Rep[]>();
  const memReps = new Map<string, Rep[]>();
  const crReps = new Map<string, Rep[]>();
  for (const r of reps) {
    if (r.course_review_id) crReps.set(r.course_review_id, [...(crReps.get(r.course_review_id) ?? []), r]);
    else if (r.post_id) postReps.set(r.post_id, [...(postReps.get(r.post_id) ?? []), r]);
    else if (r.profile_id) memReps.set(r.profile_id, [...(memReps.get(r.profile_id) ?? []), r]);
  }
  const blockCount = new Map<string, number>();
  for (const b of (blocksRes.data ?? []) as { blocked_id: string }[]) blockCount.set(b.blocked_id, (blockCount.get(b.blocked_id) ?? 0) + 1);

  const postIds = [...postReps.keys()];
  const memIds = [...new Set([...memReps.keys(), ...blockCount.keys()])];
  const [postsRes, peopleRes] = await Promise.all([
    postIds.length ? supabase.from("posts").select("id, title, body, hidden_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)").in("id", postIds) : Promise.resolve({ data: [] }),
    memIds.length ? supabase.from("profiles").select("id, full_name, headline, avatar_url, status").in("id", memIds) : Promise.resolve({ data: [] }),
  ]);
  const crIds = [...crReps.keys()];
  const { data: crRows } = crIds.length ? await supabase.from("course_reviews").select("id, body, hidden_at, course:courses(title), member:profiles!course_reviews_member_id_fkey(id, full_name, avatar_url)").in("id", crIds) : { data: [] };
  type CrRow = { id: string; body: string; hidden_at: string | null; course: { title: string } | null; member: { id: string; full_name: string; avatar_url: string | null } | null };
  let crItems = ((crRows ?? []) as unknown as CrRow[]).map((r) => ({ id: r.id, r, n: crReps.get(r.id)!.length }));
  if (cf === "hidden") crItems = crItems.filter((x) => x.r.hidden_at);
  const posts = new Map(((postsRes.data ?? []) as unknown as { id: string; title: string | null; body: string; hidden_at: string | null; author: { id: string; full_name: string; avatar_url: string | null } | null }[]).map((p) => [p.id, p]));
  const people = new Map(((peopleRes.data ?? []) as Person[]).map((p) => [p.id, p]));

  let items = postIds.map((id) => ({ id, p: posts.get(id), n: postReps.get(id)!.length })).filter((x) => x.p);
  if (cf === "hidden") items = items.filter((x) => x.p!.hidden_at);
  let mem = memIds.map((id) => ({ id, m: people.get(id), blocks: blockCount.get(id) ?? 0, n: memReps.get(id)?.length ?? 0 })).filter((x) => x.m);
  if (mf === "blocked") mem = mem.filter((x) => x.blocks > 0);
  if (mf === "reported") mem = mem.filter((x) => x.n > 0);
  if (mf === "suspended") mem = mem.filter((x) => x.m!.status === "suspended");
  mem.sort((a, b) => b.blocks + b.n - (a.blocks + a.n));

  const totalContent = postIds.length + crIds.length;
  const totalMembers = memIds.length;
  const tabs: [string, string][] = [["content", `Reported content (${totalContent})`], ["stories", "Stories (0)"], ["members", `Flagged members (${totalMembers})`], ["settings", "Settings"]];
  const s = settingsRes.data as { types: TypeSet; member_report: boolean; blocking: boolean; sus_blocks: { on: boolean; n: number }; sus_reports: { on: boolean; n: number }; email_on: boolean; email_subject: string; email_body: string } | null;
  const cats = (catsRes.data ?? []) as { id: string; name: string; description: string; show: string }[];

  const Bulk = ({ opts }: { opts: [string, string][] }) => (
    <div className="row" style={{ flexWrap: "wrap" }}>
      <label className="sr" htmlFor="mbulk">Bulk action</label>
      <select id="mbulk" name="bulk" className="field" style={{ width: "auto", flex: "0 0 auto" }}>
        <option value="">Bulk actions</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <button type="submit" className="btn sm ghost">Apply</button>
    </div>
  );

  return (
    <TeamWrap>
      <TeamHead title="Moderation" text="Members block and report. The Hub hides and suspends at the limits you set. You review everything here and can reverse any of it." />
      <nav className="autabs" aria-label="Moderation sections">
        {tabs.map(([k, l]) => <Link key={k} className="chip" href={`/moderation?tab=${k}`} aria-current={tab === k ? "true" : undefined}>{l}</Link>)}
      </nav>

      {tab === "stories" && <div className="card"><p className="muted">No stories are waiting for review. Stories that are reported or need approval will show here once Stories are switched on.</p></div>}

      {tab === "content" && (
        <form action={moderate} className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Bulk opts={[["hide", "Hide"], ["show", "Unhide"], ["dismiss", "Dismiss reports"]]} />
              <span className="grow" />
              <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <Link className="chip" href="/moderation?tab=content" aria-current={!cf ? "true" : undefined}>All content types</Link>
                <Link className="chip" href="/moderation?tab=content&cf=hidden" aria-current={cf === "hidden" ? "true" : undefined}>Currently hidden</Link>
              </span>
            </div>
          </div>
          {items.length || crItems.length ? (
            <div className="cmpwrap" style={{ border: 0 }} tabIndex={0} role="region" aria-label="Reported content">
              <table className="modtbl">
                <thead><tr><th scope="col"><span className="sr">Select</span></th><th scope="col">Content</th><th scope="col">Owner</th><th scope="col">Reports</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {items.map(({ id, p, n }) => (
                    <tr key={id}>
                      <td><input type="checkbox" name="sel" value={id} aria-label="Select" /></td>
                      <td><span className="tag">Post</span> {(p!.title || p!.body).slice(0, 90)}</td>
                      <td><span className="row" style={{ gap: 8 }}><ZipAv name={p!.author?.full_name || "M"} src={p!.author?.avatar_url} size="s" />{p!.author?.full_name}</span></td>
                      <td><span className="cnt"><Ic n="flag" s={14} />{n}</span></td>
                      <td>{p!.hidden_at ? <span className="pill hid">Hidden</span> : <span className="muted small">Visible</span>}</td>
                      <td>
                        <span className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", alignItems: "flex-start" }}>
                          <details>
                            <summary className="btn sm ghost">View report</summary>
                            <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 16, maxWidth: 260 }}>
                              {postReps.get(id)!.map((r) => <li key={r.id}><b>{r.reason}</b> · {r.reporter?.full_name ?? "A member"} · {timeAgo(r.created_at)}</li>)}
                            </ul>
                          </details>
                          <button type="submit" name="op" value={`${p!.hidden_at ? "show" : "hide"}:${id}`} className="btn sm ghost">{p!.hidden_at ? "Unhide" : "Hide"}</button>
                          <button type="submit" name="op" value={`dismiss:${id}`} className="btn sm ghost">Dismiss</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {crItems.map(({ id, r, n }) => (
                    <tr key={id}>
                      <td><input type="checkbox" name="sel" value={`cr:${id}`} aria-label="Select" /></td>
                      <td><span className="tag">Course review</span> {`Review of ${r.course?.title ?? "a course"}: ${r.body.slice(0, 60)}`}</td>
                      <td><span className="row" style={{ gap: 8 }}><ZipAv name={r.member?.full_name || "M"} src={r.member?.avatar_url} size="s" />{r.member?.full_name}</span></td>
                      <td><span className="cnt"><Ic n="flag" s={14} />{n}</span></td>
                      <td>{r.hidden_at ? <span className="pill hid">Hidden</span> : <span className="muted small">Visible</span>}</td>
                      <td>
                        <span className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", alignItems: "flex-start" }}>
                          <details>
                            <summary className="btn sm ghost">View report</summary>
                            <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 16, maxWidth: 260 }}>
                              {crReps.get(id)!.map((x) => <li key={x.id}><b>{x.reason}</b> · {x.reporter?.full_name ?? "A member"} · {timeAgo(x.created_at)}{x.note ? <> · “{x.note}”</> : null}</li>)}
                            </ul>
                          </details>
                          <button type="submit" name="op" value={`${r.hidden_at ? "crshow" : "crhide"}:${id}`} className="btn sm ghost">{r.hidden_at ? "Unhide" : "Hide"}</button>
                          <button type="submit" name="op" value={`crdismiss:${id}`} className="btn sm ghost">Dismiss</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="card"><p className="muted">Nothing to review here.</p></div>}
        </form>
      )}

      {tab === "members" && (
        <form action={moderate} className="stack" style={{ gap: 16 }}>
          <div className="card">
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Bulk opts={[["suspend", "Suspend"], ["unsuspend", "Lift suspension"]]} />
              <span className="grow" />
              <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {[["", "All flagged members"], ["blocked", "Blocked by someone"], ["reported", "Reported"], ["suspended", "Suspended"]].map(([v, l]) => (
                  <Link key={v} className="chip" href={`/moderation?tab=members${v ? `&mf=${v}` : ""}`} aria-current={mf === v ? "true" : undefined}>{l}</Link>
                ))}
              </span>
            </div>
          </div>
          {mem.length ? (
            <div className="cmpwrap" style={{ border: 0 }} tabIndex={0} role="region" aria-label="Flagged members">
              <table className="modtbl">
                <thead><tr><th scope="col"><span className="sr">Select</span></th><th scope="col">Member</th><th scope="col">Blocks</th><th scope="col">Reports</th><th scope="col">Status</th><th scope="col"><span className="sr">Actions</span></th></tr></thead>
                <tbody>
                  {mem.map(({ id, m, blocks, n }) => {
                    const sus = m!.status === "suspended";
                    return (
                      <tr key={id}>
                        <td><input type="checkbox" name="sel" value={id} aria-label={`Select ${m!.full_name}`} /></td>
                        <td><span className="row" style={{ gap: 8 }}><ZipAv name={m!.full_name} src={m!.avatar_url} size="s" /><span className="stack"><strong>{m!.full_name}</strong><span className="muted small">{m!.headline}</span></span></span></td>
                        <td><span className="cnt"><Ic n="ban" s={14} />{blocks}</span></td>
                        <td><span className="cnt"><Ic n="flag" s={14} />{n}</span></td>
                        <td>{sus ? <span className="pill sus">Suspended</span> : <span className="muted small">Active</span>}</td>
                        <td>
                          <span className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap", alignItems: "flex-start" }}>
                            <details>
                              <summary className="btn sm ghost">View report</summary>
                              <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 16, maxWidth: 260 }}>
                                {(memReps.get(id) ?? []).map((r) => <li key={r.id}><b>{r.reason}</b> · {r.reporter?.full_name ?? "A member"} · {timeAgo(r.created_at)}</li>)}
                                {!memReps.get(id) && <li>Blocked by {blocks} member{blocks === 1 ? "" : "s"}. No reports.</li>}
                              </ul>
                            </details>
                            <button type="submit" name="op" value={`${sus ? "unsuspend" : "suspend"}:${id}`} className="btn sm ghost">{sus ? "Lift suspension" : "Suspend"}</button>
                            {n > 0 && <button type="submit" name="op" value={`clear:${id}`} className="btn sm ghost">Dismiss</button>}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="card"><p className="muted">No members match.</p></div>}
        </form>
      )}

      {tab === "settings" && s && (
        <div className="setgrid">
          <form action={saveModerationSettings} className="stack" style={{ display: "contents" }}>
            <div className="card">
              <h2>What members can report</h2>
              <p className="muted small">A switch for every kind of content, and how many reports hide it on its own. Feed posts and course reviews are reportable so far.</p>
              {MTYPES.map(([k, l]) => (
                <div className="setrow" key={k}>
                  <label className="row" style={{ gap: 8 }}><input type="checkbox" name={`on_${k}`} defaultChecked={s.types[k]?.on} />{l}</label>
                  <span className="grow" />
                  <label className="row small" style={{ gap: 6 }}>
                    <input type="checkbox" name={`auto_${k}`} defaultChecked={s.types[k]?.auto} />Auto hide after
                    <input className="numin" type="number" name={`hide_${k}`} min={1} max={50} defaultValue={s.types[k]?.hide ?? 3} aria-label={`Reports before ${l} are hidden`} />reports
                  </label>
                </div>
              ))}
              <div className="setrow"><label className="row" style={{ gap: 8 }}><input type="checkbox" name="member_report" defaultChecked={s.member_report} />Members can report other members</label></div>
              <div className="setrow"><label className="row" style={{ gap: 8 }}><input type="checkbox" name="blocking" defaultChecked={s.blocking} />Members can block other members</label></div>
            </div>
            <div className="card">
              <h2>Auto suspend</h2>
              <p className="muted small">One limit counts blocks, the other counts reports. Cross either and the member is suspended on the spot.</p>
              <div className="setrow">
                <label className="row" style={{ gap: 8 }}><input type="checkbox" name="sus_blocks_on" defaultChecked={s.sus_blocks.on} />Suspend members after</label>
                <input className="numin" type="number" name="sus_blocks_n" min={1} max={99} defaultValue={s.sus_blocks.n} aria-label="Blocks before suspension" /><span className="small">blocks</span>
              </div>
              <div className="setrow">
                <label className="row" style={{ gap: 8 }}><input type="checkbox" name="sus_reports_on" defaultChecked={s.sus_reports.on} />Suspend members after</label>
                <input className="numin" type="number" name="sus_reports_n" min={1} max={99} defaultValue={s.sus_reports.n} aria-label="Reports before suspension" /><span className="small">reports</span>
              </div>
              <h2 style={{ marginTop: 10 }}>Email the team</h2>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" name="email_on" defaultChecked={s.email_on} />Email administrators on every automatic suspension</label>
              <label htmlFor="mes" className="small" style={{ fontWeight: 600 }}>Subject<input id="mes" name="email_subject" className="field" defaultValue={s.email_subject} /></label>
              <label htmlFor="meb" className="small" style={{ fontWeight: 600 }}>Message<textarea id="meb" name="email_body" className="field" rows={4} defaultValue={s.email_body} /></label>
              <span className="muted small">Words in double braces, such as {"{{user.name}}"}, are filled in automatically. Emails start once email sending is switched on.</span>
              <button type="submit" className="btn sm" style={{ alignSelf: "flex-start" }}>Save settings</button>
            </div>
          </form>
          <div className="card">
            <h2>Report categories</h2>
            <p className="muted small">The reasons members pick. Each one shows for content, for members, or for both.</p>
            <div>
              {cats.map((c) => (
                <details key={c.id} className="setrow">
                  <summary className="row" style={{ width: "100%", gap: 10, cursor: "pointer" }}>
                    <span className="stack grow" style={{ gap: 1 }}><strong style={{ fontSize: 13.5 }}>{c.name}</strong><span className="muted small">{c.description}</span></span>
                    <span className="tag">{c.show === "both" ? "Content and members" : c.show === "member" ? "Members" : "Content"}</span>
                    <span style={{ color: "var(--link)", fontWeight: 600 }}>Edit</span>
                  </summary>
                  <form action={saveReportCategory} className="stack" style={{ gap: 8, width: "100%", marginTop: 8 }}>
                    <input type="hidden" name="id" value={c.id} />
                    <label className="small" style={{ fontWeight: 600 }}>Name<input name="name" className="field" defaultValue={c.name} required /></label>
                    <label className="small" style={{ fontWeight: 600 }}>Description<input name="description" className="field" defaultValue={c.description} /></label>
                    <label className="small" style={{ fontWeight: 600 }}>Shown for
                      <select name="show" className="field" defaultValue={c.show}><option value="both">Content and members</option><option value="content">Content</option><option value="member">Members</option></select>
                    </label>
                    <span className="row"><button type="submit" className="btn sm">Save</button><button type="submit" formAction={deleteReportCategory} className="btn sm ghost">Delete {c.name}</button></span>
                  </form>
                </details>
              ))}
            </div>
            <form action={saveReportCategory} className="stack" style={{ gap: 8 }}>
              <h2 style={{ fontSize: 14 }}>Add category</h2>
              <label className="sr" htmlFor="cname">Category name</label>
              <input id="cname" name="name" className="field" placeholder="Name" required />
              <label className="sr" htmlFor="cdesc">Description</label>
              <input id="cdesc" name="description" className="field" placeholder="Short description" />
              <label className="sr" htmlFor="cshow">Shown for</label>
              <select id="cshow" name="show" className="field"><option value="both">Content and members</option><option value="content">Content</option><option value="member">Members</option></select>
              <button type="submit" className="btn sm" style={{ alignSelf: "flex-start" }}>Add category</button>
            </form>
          </div>
        </div>
      )}
    </TeamWrap>
  );
}
