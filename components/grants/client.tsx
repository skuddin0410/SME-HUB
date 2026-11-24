"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { GfBadge, GfTag } from "@/components/grants/bits";
import { addGrantDeadline, askGrant, draftGrant, saveGrant, setGrantReady, setGrantStage, suggestGrant } from "@/app/(hub)/grant-actions";
import { ASK_CHIPS, BENEFITS_FINDER, PROV_NAMES, READY_ITEMS, STAGES, TYPE_OPTS, filterGrants, type AiLeft, type Grant, type GrantSave } from "@/lib/grants";

type Modal = null | "up" | "sug";
type Ctx = { signedIn: boolean; saved: Set<string>; toggle: (id: string) => void; toast: (t: string) => void; open: (m: Modal) => void };
const C = createContext<Ctx | null>(null);
const useGf = () => useContext(C)!;

/** Holds the member's saves, the toast and the two windows (Plus plans, Tell us about a program). */
export function GfProvider({ signedIn, saved: init, children }: { signedIn: boolean; saved: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => new Set(init));
  const [note, setNote] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [, start] = useTransition();
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 3500); return () => clearTimeout(t); }, [note]);
  useEffect(() => { setSaved(new Set(init)); }, [init]);
  const toggle = (id: string) => {
    if (!signedIn) { router.push(`/auth/login?next=${encodeURIComponent(location.pathname)}`); return; }
    const on = !saved.has(id);
    setSaved((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
    setNote(on ? "Saved to My funding" : "Removed from My funding");
    start(async () => { const r = await saveGrant(id, on); if (r.error) setNote(r.error); router.refresh(); });
  };
  return (
    <C.Provider value={{ signedIn, saved, toggle, toast: setNote, open: setModal }}>
      {children}
      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mt" onClick={(e) => e.stopPropagation()}>
            {modal === "up" ? <UpModal close={() => setModal(null)} /> : <SugModal close={() => setModal(null)} toast={setNote} />}
          </div>
        </div>
      )}
      {note && <div className="toast" role="status">{note}</div>}
    </C.Provider>
  );
}

export function SaveBtn({ id }: { id: string }) {
  const g = useGf();
  const on = g.saved.has(id);
  return (
    <button type="button" className={`btn ghost gfsv${on ? " on" : ""}`} aria-pressed={on} onClick={() => g.toggle(id)}>
      <Ic n={on ? "gfsaved" : "gfsave"} s={14} />{on ? "Saved" : "Save"}
    </button>
  );
}

export function GfCard({ p }: { p: Grant }) {
  return (
    <li className="gfcard">
      <div className="gfct"><GfTag p={p} /><span className="gfwho">{PROV_NAMES[p.prov]}</span></div>
      <h3><Link href={`/grants/${p.id}`}>{p.name}</Link></h3>
      <p className="gfby">{p.by_org}</p>
      <dl className="gfdl"><div><dt>Amount</dt><dd>{p.amount}</dd></div><div><dt>For</dt><dd>{p.use_for}</dd></div><div><dt>Deadline</dt><dd>{p.deadline}</dd></div></dl>
      <div className="gfcf"><GfBadge p={p} /><div className="row" style={{ gap: 8 }}><SaveBtn id={p.id} /><Link className="btn" href={`/grants/${p.id}`}>View details</Link></div></div>
    </li>
  );
}

const Sel = ({ id, label, v, set, opts }: { id: string; label: string; v: string; set: (v: string) => void; opts: [string, string][] }) => (
  <label className="tlf" htmlFor={id}><span>{label}</span><select id={id} value={v} onChange={(e) => set(e.target.value)}>{opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></label>
);

/** Find funding: the hero with search and filters, the matches (passed in), then every program, checked ones first. */
export function FindFunding({ all, prov, children }: { all: Grant[]; prov: string | null; children: React.ReactNode }) {
  const g = useGf();
  const [q, setQ] = useState("");
  const [pv, setPv] = useState(prov ?? "all");
  const [type, setType] = useState("all");
  const R = filterGrants(all, q, pv, type);
  const provOpts: [string, string][] = [["all", "All of Canada"], ...Object.entries(PROV_NAMES).filter(([k]) => k !== "CA").sort((a, b) => a[1].localeCompare(b[1]))];
  return (
    <>
      <section className="tlhero gfhero">
        <p className="pgkick2">Grant Finder</p>
        <h1>Find funding for your business</h1>
        <p>Grants, loans, tax credits and wage subsidies from federal, provincial and territorial programs, in one search. Free for every member.</p>
        <div className="gfsearch">
          <label className="gfq" htmlFor="gfq"><Ic n="search" s={18} /><span className="sr-only">Search programs</span><input id="gfq" type="search" placeholder="Try “export”, “hiring” or “equipment”" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <Sel id="gfprov" label="Where is your business?" v={pv} set={setPv} opts={provOpts} />
          <Sel id="gftype" label="Type of funding" v={type} set={setType} opts={TYPE_OPTS} />
        </div>
      </section>
      {children}
      <section>
        <div className="gfrh"><h2>{R.length} {R.length === 1 ? "program" : "programs"} found</h2><p className="small muted">Programs our team has checked are listed first.</p></div>
        <ul className="gflist">{R.map((p) => <GfCard key={p.id} p={p} />)}</ul>
        <div className="card gfnet">
          <h3>Not finding what you need?</h3>
          <p>We add programs every week. You can also search the Government of Canada’s own Business Benefits Finder, or tell us about a program we’re missing.</p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <a className="btn ghost" href={BENEFITS_FINDER} target="_blank" rel="noopener noreferrer"><Ic n="ext" s={14} />Search the government finder</a>
            <button type="button" className="btn ghost" onClick={() => (g.signedIn ? g.open("sug") : g.toast("Sign in to tell us about a program"))}><Ic n="plus" s={14} />Tell us about a program</button>
          </div>
        </div>
      </section>
    </>
  );
}

function UpModal({ close }: { close: () => void }) {
  const rows: [string, string, string][] = [["Search every program", "Yes", "Yes"], ["Your matches", "All", "All"], ["New match alerts", "Weekly", "Same day"], ["Saved programs", "Unlimited", "Unlimited"], ["Deadlines in My deadlines", "Unlimited", "Unlimited"], ["Readiness checklist", "Yes", "Yes"], ["Application tracker", "Yes", "Yes"], ["AI questions", "10 a month", "100 a month"], ["AI application drafts", "1 a month", "5 a month"]];
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Save time with Plus</h2>
      <p className="small muted">Finding programs stays free. Plus does the work around them.</p>
      <table className="gftab"><thead><tr><th /><th>Free</th><th>Plus</th></tr></thead><tbody>{rows.map((r) => <tr key={r[0]}><th>{r[0]}</th><td>{r[1]}</td><td><b>{r[2]}</b></td></tr>)}</tbody></table>
      <p className="small muted">Flat monthly price. We never take a cut of the funding you win.</p>
      <div className="row" style={{ gap: 10 }}><Link className="btn" href="/membership-plans">See Plus plans</Link><button type="button" className="btn ghost" onClick={close}>Not now</button></div>
    </>
  );
}

function SugModal({ close, toast }: { close: () => void; toast: (t: string) => void }) {
  const [n, setN] = useState("");
  const [u, setU] = useState("");
  const [err, setErr] = useState("");
  const [busy, start] = useTransition();
  const send = () => start(async () => { const r = await suggestGrant(n, u); if (r.error) { setErr(r.error); return; } close(); toast("Thanks. Our team will check it and add it."); });
  return (
    <>
      <h2 id="mt" style={{ fontSize: 20 }}>Tell us about a program</h2>
      <p className="small muted">Our team checks it and adds it to the Grant Finder, usually within a week.</p>
      <div className="stack" style={{ gap: 12 }}>
        <label className="tlf" htmlFor="gfs-n"><span>Program name</span><span className="tlin"><input id="gfs-n" type="text" value={n} onChange={(e) => setN(e.target.value)} autoFocus /></span></label>
        <label className="tlf" htmlFor="gfs-u"><span>Link to the official page</span><span className="tlin"><input id="gfs-u" type="text" value={u} onChange={(e) => setU(e.target.value)} /></span><small>We only list programs with an official government or lender page.</small></label>
        {err && <p className="small" role="alert" style={{ color: "#B42318", margin: 0 }}>{err}</p>}
        <div className="row" style={{ gap: 10 }}><button type="button" className="btn" disabled={busy} onClick={send}>Send to our team</button><button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
      </div>
    </>
  );
}

/** Program page buttons: Apply on the official page, Save, Add to My deadlines. */
export function ProgramButtons({ p }: { p: Grant }) {
  const g = useGf();
  const router = useRouter();
  const [busy, start] = useTransition();
  const add = () => {
    if (!g.signedIn) { router.push(`/auth/login?next=/grants/${p.id}`); return; }
    start(async () => { const r = await addGrantDeadline(p.id); g.toast(r.error ?? "Added to My deadlines. We’ll remind you before it."); });
  };
  return (
    <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
      <a className="btn" href={p.url ?? BENEFITS_FINDER} target="_blank" rel="noopener noreferrer"><Ic n="ext" s={14} />Apply on the official page</a>
      <SaveBtn id={p.id} />
      <button type="button" className="btn ghost" disabled={busy} onClick={add}><Ic n="cal2" s={14} />Add to My deadlines</button>
    </div>
  );
}

const leftText = (l: AiLeft | null) => (l ? `You have ${Math.max(0, l.questions)} of ${l.qmax} ${l.plus ? "" : "free "}questions left this month.` : "Sign in to ask up to 10 free questions a month.");

/** "Ask about this program": answers use only the program details on the page. */
export function AskBox({ p, ai }: { p: Grant; ai: AiLeft | null }) {
  const g = useGf();
  const router = useRouter();
  const [left, setLeft] = useState(ai);
  const [ans, setAns] = useState<{ q: string; t: string } | null>(null);
  const [busy, start] = useTransition();
  const ask = (q: string) => {
    if (!g.signedIn) { router.push(`/auth/login?next=/grants/${p.id}`); return; }
    start(async () => {
      const r = await askGrant(p.id, q);
      if (r.upgrade) { g.open("up"); return; }
      if (r.error) { g.toast(r.error); return; }
      setAns({ q, t: r.text ?? "" });
      if (r.left) setLeft(r.left);
    });
  };
  return (
    <section className="card gfai" aria-busy={busy}>
      <h2><Ic n="spark" s={18} />Ask about this program</h2>
      <p className="small muted">Answers use only the program details on this page. {leftText(left)}</p>
      <div className="gfsq">{ASK_CHIPS.map((t) => <button key={t} type="button" className="chip" disabled={busy} onClick={() => ask(t)}>{t}</button>)}</div>
      {ans && (
        <div className="gfans" aria-live="polite">
          <p className="small" style={{ fontWeight: 600, margin: "0 0 6px" }}>{ans.q}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{ans.t}</p>
          <p className="small muted" style={{ margin: "6px 0 0" }}><Ic n="info" s={12} /> AI answers can be wrong. The official page is always the final word.</p>
        </div>
      )}
    </section>
  );
}

/** "Am I ready to apply?": free for every member (final plan), with one AI draft a month on Free and 5 on Plus. */
export function ReadyCard({ p, save, ai }: { p: Grant; save: GrantSave | null; ai: AiLeft | null }) {
  const g = useGf();
  const router = useRouter();
  const [R, setR] = useState<Record<string, boolean>>(save?.ready ?? {});
  const [draft, setDraft] = useState("");
  const [left, setLeft] = useState(ai);
  const [busy, start] = useTransition();
  const done = READY_ITEMS.filter((_, i) => R[i]).length;
  if (!g.signedIn) {
    return (
      <section className="card gfblur">
        <h2>Am I ready to apply?</h2>
        <div aria-hidden="true">{READY_ITEMS.slice(0, 3).map((t) => <p key={t} className="dlchk">☐ {t}</p>)}</div>
        <div className="gflock"><Ic n="lock" s={18} /><div><h3>Readiness checklist and AI application help</h3><p>Free members get a checklist for every program and an AI draft of the application to edit.</p></div><Link className="btn" href={`/auth/sign-up?next=/grants/${p.id}`}>Join free</Link></div>
      </section>
    );
  }
  const tick = (i: number, on: boolean) => {
    setR((x) => ({ ...x, [i]: on }));
    start(async () => { const r = await setGrantReady(p.id, i, on); if (r.error) g.toast(r.error); router.refresh(); });
  };
  const make = () => start(async () => {
    const r = await draftGrant(p.id);
    if (r.upgrade) { g.open("up"); return; }
    if (r.error) { g.toast(r.error); return; }
    setDraft(r.text ?? "");
    if (r.left) setLeft(r.left);
  });
  return (
    <section className="card">
      <h2>Am I ready to apply?</h2>
      <p className="small muted">{done} of {READY_ITEMS.length} done</p>
      <div className="gfbar"><span style={{ width: `${Math.round((done / READY_ITEMS.length) * 100)}%` }} /></div>
      {READY_ITEMS.map((t, i) => <label key={t} className="dlchk"><input type="checkbox" checked={!!R[i]} onChange={(e) => tick(i, e.target.checked)} /> {t}</label>)}
      <button type="button" className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={make}><Ic n="spark" s={14} />Draft my application with AI</button>
      <p className="small muted" style={{ margin: "8px 0 0" }}>{left ? `${Math.max(0, left.drafts)} of ${left.dmax} ${left.dmax === 1 ? "draft" : "drafts"} left this month.` : ""} You review and send it yourself on the official page.</p>
      {draft && <textarea className="gfdraft" aria-label="Your draft application" defaultValue={draft} rows={14} style={{ width: "100%", marginTop: 12, font: "14px/1.55 var(--body)", padding: 12, borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }} />}
    </section>
  );
}

/** My funding: the tracker, Saved → Preparing → Submitted → Approved (free for every member). */
export function Tracker({ all, saves }: { all: Grant[]; saves: GrantSave[] }) {
  const g = useGf();
  const router = useRouter();
  const [st, setSt] = useState<Record<string, string>>(() => Object.fromEntries(saves.map((s) => [s.program_id, s.stage])));
  const [, start] = useTransition();
  const S = saves.map((s) => all.find((p) => p.id === s.program_id)).filter(Boolean) as Grant[];
  const move = (id: string, v: string) => {
    setSt((x) => ({ ...x, [id]: v }));
    g.toast(`Moved to ${v}`);
    start(async () => { const r = await setGrantStage(id, v); if (r.error) g.toast(r.error); router.refresh(); });
  };
  return (
    <div className="gfboard">
      {STAGES.map((c) => {
        const L = S.filter((p) => (st[p.id] || "Saved") === c);
        return (
          <section key={c} className="gfcol" aria-label={c}>
            <h2>{c} <span>{L.length}</span></h2>
            {L.map((p) => (
              <div key={p.id} className="gfmini">
                <Link href={`/grants/${p.id}`}>{p.name}</Link>
                <small>{p.amount}</small>
                <Sel id={`gfs-${p.id}`} label="Stage" v={st[p.id] || "Saved"} set={(v) => move(p.id, v)} opts={STAGES.map((x) => [x, x])} />
              </div>
            ))}
            {!L.length && <p className="small muted">Nothing here yet</p>}
          </section>
        );
      })}
    </div>
  );
}
