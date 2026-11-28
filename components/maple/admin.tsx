"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { mapleAdmin } from "@/app/(hub)/maple-actions";

/** Update 47: the Hub team's answer library and token use (/mapleadmin). */
export type MaAnswer = { id: number; question: string; variants: string[]; answer: string; sources: { title: string; url: string }[]; lang: "en" | "fr"; status: "draft" | "approved" | "needs_review" | "retired"; checked_on: string | null; review_by: string | null; times_used: number; tokens_saved: number };
export type MaRepeated = { question: string; times_asked: number; members: number; last_asked: string };
export type MaReport = { month: string; questions: number; byRoute: { hub: number; library: number; small: number; large: number }; tokens: { input: number; output: number; cached: number } };

const SKIP_KEY = "smehub.mapleadmin.skip.v1";
const today = () => new Date().toISOString().slice(0, 10);
const due = (x: MaAnswer) => x.status === "needs_review" || (x.status === "approved" && !!x.review_by && x.review_by < today());
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace(/0$/, "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "k" : String(n));
const dateOf = (s: string | null) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "–");
const agoOf = (iso: string) => {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
};
const words = (s: string) => (s.trim().match(/\S+/g) ?? []).length;

type Ed = { id: number; q: string; v: string; a: string; s: string; lang: "en" | "fr"; m: number; err: string; ai?: boolean; fromRep?: string };

export function MapleAdmin({ answers: a0, repeated, report, setUp }: { answers: MaAnswer[]; repeated: MaRepeated[]; report: MaReport | null; setUp: boolean }) {
  const router = useRouter();
  const [lib, setLib] = useState(a0);
  const [tab, setTab] = useState<"lib" | "rep" | "due">("lib");
  const [skip, setSkip] = useState<string[]>([]);
  const [ed, setEd] = useState<Ed | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setLib(a0), [a0]);
  useEffect(() => {
    try { setSkip(JSON.parse(localStorage.getItem(SKIP_KEY) || "[]")); } catch { /* fine */ }
  }, []);
  const rep = repeated.filter((r) => !skip.includes(r.question));
  const live = lib.filter((x) => x.status !== "retired");
  const dueList = lib.filter(due);
  const month = report ? new Date(`${report.month}T12:00:00`).toLocaleDateString("en-CA", { month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const K = report ?? { questions: 0, byRoute: { hub: 0, library: 0, small: 0, large: 0 }, tokens: { input: 0, output: 0, cached: 0 } };
  const total = Math.max(1, K.byRoute.hub + K.byRoute.library + K.byRoute.small + K.byRoute.large);
  const free = K.byRoute.hub + K.byRoute.library;
  const saved = lib.reduce((n, x) => n + Number(x.tokens_saved || 0), 0);
  const seg: [string, number, string][] = [["Hub data, no AI", K.byRoute.hub, "hub"], ["Answer library", K.byRoute.library, "lib"], ["Small model", K.byRoute.small, "sm"], ["Large model", K.byRoute.large, "lg"]];

  const open = (x: MaAnswer | null, extra: Partial<Ed> = {}) =>
    setEd({ id: x?.id ?? 0, q: x?.question ?? "", v: (x?.variants ?? []).join("\n"), a: x?.answer ?? "", s: (x?.sources ?? []).map((s) => `${s.title} | ${s.url}`).join("\n"), lang: x?.lang ?? "en", m: 6, err: "", ...extra });

  const commit = async (approve: boolean) => {
    if (!ed) return;
    const w = words(ed.a);
    const err = ed.q.trim().length < 5 ? "Please write the question." : w < 5 ? "Please write the answer." : w > 120 ? "Keep the answer to 120 words or fewer. Short answers are cheaper and easier to read." : "";
    const sources = ed.s.split("\n").map((l) => { const p = l.split("|"); return { title: p[0].trim(), url: (p[1] ?? "").trim() }; }).filter((p) => p.title && /^https:\/\//.test(p.url));
    if (!err && approve && /gst|hst|tps|tvh|tax|grant|cra|legal|incorporat/i.test(`${ed.q} ${ed.a}`) && !sources.length) return setEd({ ...ed, err: "Tax, legal and grant answers need an official source before approval." });
    if (err) return setEd({ ...ed, err });
    setBusy(true);
    const r = await mapleAdmin<{ id?: number }>(approve ? "approve" : "save", {
      answer: { id: ed.id || undefined, question: ed.q.trim(), variants: ed.v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10), answer: ed.a.trim(), sources, lang: ed.lang },
      reviewMonths: ed.m,
    }).catch(() => ({ error: "That didn’t work. Please try again." }));
    setBusy(false);
    if (r.error) return setEd({ ...ed, err: r.error });
    if (ed.fromRep) hide(ed.fromRep, false);
    setEd(null);
    toast(approve ? "Approved. Maple will reuse this answer from now on." : "Saved as a draft. Maple won’t use it until it’s approved.");
    router.refresh();
  };
  const retire = async () => {
    if (!ed?.id) return;
    setBusy(true);
    const r = await mapleAdmin("retire", { id: ed.id }).catch(() => ({ error: "That didn’t work. Please try again." }));
    setBusy(false);
    if (r.error) return setEd({ ...ed, err: r.error });
    setEd(null);
    toast("Maple won’t use this answer any more. It’s kept for your records.");
    router.refresh();
  };
  const hide = (q: string, tell = true) => {
    const next = [...skip, q];
    setSkip(next);
    try { localStorage.setItem(SKIP_KEY, JSON.stringify(next.slice(-200))); } catch { /* fine */ }
    if (tell) toast("Removed from the list");
  };
  const write = async (q: string) => {
    open(null, { q, ai: true, fromRep: q, a: "" });
    const r = await mapleAdmin<{ draft?: string }>("draft", { question: q }).catch(() => ({ draft: "" }));
    setEd((e) => (e && e.fromRep === q && !e.a ? { ...e, a: (r as { draft?: string }).draft ?? "", ai: !!(r as { draft?: string }).draft } : e));
  };

  const list = tab === "due" ? dueList : live;
  return (
    <div className="ma">
      <div className="mahead">
        <div>
          <p className="eyebrow">Hub team · Maple (AI)</p>
          <h1>Answer library and token use</h1>
          <p className="muted">Approve an answer once and Maple reuses it for every member who asks, without paying for a new AI answer.</p>
        </div>
      </div>
      {!setUp && <p className="card small muted">The Maple service (the maple-ask and maple-admin Edge Functions, and migration 0081) isn’t set up yet, so there’s nothing to show. Until it is, Maple answers with the Hub’s own rules.</p>}
      <div className="makpis">
        {([
          [`Questions in ${month}`, K.questions.toLocaleString("en-CA"), "Free 10 · Plus and Advisor 100 a month"],
          ["Answered without new AI", `${Math.round((free / total) * 100)}%`, `${free.toLocaleString("en-CA")} from Hub data or the library`],
          ["AI tokens used", fmt(K.tokens.input + K.tokens.output), `${fmt(K.tokens.input)} in · ${fmt(K.tokens.output)} out`],
          ["Tokens saved by the library", fmt(saved), "About 700 per reused answer"],
        ] as const).map(([t, b, s], i) => (
          <div key={t} className={`makpi${i === 1 ? " good" : ""}`}><span>{t}</span><b>{b}</b><small>{s}</small></div>
        ))}
      </div>
      <section className="card">
        <div className="row"><h2 className="grow">How questions were answered</h2><span className="small muted">{month}</span></div>
        <div className="mabar" role="img" aria-label={seg.map((s) => `${s[0]} ${s[1]}`).join(", ")}>
          {seg.map((s) => <i key={s[2]} className={s[2]} style={{ width: `${((s[1] / total) * 100).toFixed(1)}%` }} />)}
        </div>
        <div className="malegend">{seg.map((s) => <span key={s[2]}><i className={s[2]} />{s[0]} <b>{Math.round((s[1] / total) * 100)}%</b></span>)}</div>
        <p className="small muted">Each reused library answer costs one tiny embedding call instead of a full AI answer. Large-model answers cost the most, so keep them rare.</p>
      </section>
      <div className="matabs" role="tablist">
        {([["lib", "Library", live.length], ["rep", "Repeated questions", rep.length], ["due", "Needs review", dueList.length]] as const).map(([k, l, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}<span className={`cnt${k === "due" && n ? " warn" : ""}`}>{n}</span></button>
        ))}
        <button type="button" className="btn sm" style={{ marginLeft: "auto" }} onClick={() => open(null)}><Ic n="edit" s={14} />New answer</button>
      </div>
      {tab === "rep" ? (
        <section className="card">
          <p className="small muted mapriv"><Ic n="lock" s={13} />Questions Maple answered with AI for 3 or more members in the last 30 days, with no library answer yet. You see the words and counts only, never who asked.</p>
          {rep.length ? rep.map((r) => (
            <div key={r.question} className="marow">
              <span className="grow stack" style={{ gap: 2 }}><b>{r.question}</b><small>Asked {r.times_asked} times by {r.members} members · last {agoOf(r.last_asked)}</small></span>
              <button type="button" className="btn sm" onClick={() => void write(r.question)}>Write answer</button>
              <button type="button" className="btn sm ghost" onClick={() => hide(r.question)}>Not needed</button>
            </div>
          )) : <p className="muted">Nothing waiting. New repeated questions show up here every day.</p>}
        </section>
      ) : (
        <section className="card mal">
          {list.length ? (
            <>
              <div className="marow mah"><span className="grow">Question</span><span className="mac">Status</span><span className="mac">Used</span><span className="mac">Tokens saved</span><span className="mac">Check again by</span><span className="mac2" /></div>
              {list.map((x) => {
                const d = due(x);
                return (
                  <div key={x.id} className="marow">
                    <span className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                      <b>{x.question}</b>
                      <small><span className="malang">{x.lang === "fr" ? "FR" : "EN"}</span>{x.variants.length ? `${x.variants.length} other way${x.variants.length > 1 ? "s" : ""} members ask it` : ""}{x.sources.length ? ` · ${x.sources.length} source` : " · no source"}</small>
                    </span>
                    <span className="mac"><span className={`mast ${d ? "due" : x.status}`}>{d ? "Needs review" : ({ approved: "Approved", draft: "Draft", needs_review: "Needs review", retired: "Retired" } as const)[x.status]}</span></span>
                    <span className="mac">{x.times_used.toLocaleString("en-CA")}</span>
                    <span className="mac">{fmt(Number(x.tokens_saved || 0))}</span>
                    <span className={`mac${d ? " late" : ""}`}>{dateOf(x.review_by)}</span>
                    <span className="mac2"><button type="button" className="btn sm ghost" onClick={() => open(x)}>{d ? "Review" : "Edit"}</button></span>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="muted">{tab === "due" ? "Nothing needs review. Answers come back here when their check-again date passes." : "No answers yet."}</p>
          )}
        </section>
      )}
      <p className="small muted">Answers are matched by meaning with Titan Text Embeddings in Canada, in English and French. Tax and grant answers come back for review every 6 months. <Link href="/maple">About Maple</Link></p>

      {ed && (
        <div className="overlay" onClick={() => setEd(null)}>
          <div className="modal maed" role="dialog" aria-modal="true" aria-labelledby="maedt" onClick={(e) => e.stopPropagation()}>
            <div className="polmh">
              <h2 id="maedt">{ed.id ? "Edit answer" : "New answer"}</h2>
              <button type="button" className="iconbtn" aria-label="Close" onClick={() => setEd(null)}><Ic n="x" s={18} /></button>
            </div>
            {ed.ai && <p className="maai"><Ic n="spark" s={14} />First draft by the small model. Check every fact against the source before you approve.</p>}
            <label className="maf">Question<input className="field" value={ed.q} maxLength={300} onChange={(e) => setEd({ ...ed, q: e.target.value })} /></label>
            <label className="maf">Other ways members ask it <small>One per line. Helps Maple match more questions.</small><textarea className="field" rows={2} value={ed.v} onChange={(e) => setEd({ ...ed, v: e.target.value })} /></label>
            <label className="maf">Answer <small className={words(ed.a) > 120 ? "over" : ""}>{words(ed.a)} of 120 words</small><textarea className="field" rows={6} value={ed.a} onChange={(e) => setEd({ ...ed, a: e.target.value })} /></label>
            <label className="maf">Sources <small>One per line: title | link. Official pages for tax, legal and grant answers.</small><textarea className="field" rows={2} value={ed.s} onChange={(e) => setEd({ ...ed, s: e.target.value })} /></label>
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <label className="maf sm">Language<select className="field" value={ed.lang} onChange={(e) => setEd({ ...ed, lang: e.target.value === "fr" ? "fr" : "en" })}><option value="en">English</option><option value="fr">French</option></select></label>
              <label className="maf sm">Check again in<select className="field" value={ed.m} onChange={(e) => setEd({ ...ed, m: Number(e.target.value) })}>{[3, 6, 12].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label>
            </div>
            {ed.err && <p className="sferr" role="alert">{ed.err}</p>}
            <div className="polmf">
              {!!ed.id && <button type="button" className="btn ghost sm" style={{ marginRight: "auto" }} disabled={busy} onClick={() => void retire()}>Stop using</button>}
              <button type="button" className="btn ghost sm" disabled={busy} onClick={() => void commit(false)}>Save draft</button>
              <button type="button" className="btn sm" disabled={busy} onClick={() => void commit(true)}><Ic n="check" s={14} />Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
