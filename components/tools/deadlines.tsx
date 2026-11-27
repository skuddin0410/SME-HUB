"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { addOwnDeadline, deadlineFeed, deleteOwnDeadline, saveDeadlineSetup, saveReminders, setDeadlineDone } from "@/app/(hub)/deadline-actions";
import { daysUntil, deadlinesIcs, dLong, dlDefault, dlGen, DXC, dxHow, dxIn, dxStart, MON, type DlCustom, type DlItem, type DlRem, type DlSetup } from "@/lib/deadlines";
import { TXR, txLabel, txr } from "@/lib/tools/data";

const MS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const mo = (iso: string) => Number(iso.slice(5, 7)) - 1;
const day = (iso: string) => Number(iso.slice(8, 10));
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const longNoYear = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Downloads a real calendar file (one date, or all of them) with the member's reminders as alarms (Update 38). */
function download(list: DlItem[], rem: DlRem, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([deadlinesIcs(list, rem, window.location.origin)], { type: "text/calendar" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

const DateBlock = ({ iso, cls }: { iso: string; cls?: string }) => <div className={`dxdate${cls ? ` ${cls}` : ""}`} aria-hidden="true"><span>{MS[mo(iso)]}</span><b>{day(iso)}</b></div>;

/** The five-question setup, with "Your calendar so far" updating as people answer. */
function Setup({ initial, editing, today, onCancel, onSaved }: { initial: DlSetup; editing: boolean; today: string; onCancel?: () => void; onSaved: (n: number) => void }) {
  const [F, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof DlSetup>(k: K, v: DlSetup[K]) => setF((x) => ({ ...x, [k]: v }));
  const r = txr(F.prov), tx = r[4] === "HST" ? "GST/HST" : "GST", corp = F.type === "corp";
  const P = dlGen(F, [], today);
  const cnt = { tax: 0, pay: 0, inc: 0 } as Record<string, number>;
  P.forEach((o) => { if (o.cat in cnt) cnt[o.cat]++; });
  const opts = <K extends "type" | "gst" | "pay">(k: K, list: [string, string, string][]) => (
    <div className="dxopts" role="radiogroup">
      {list.map(([v, l, sub]) => (
        <label key={v} className={`dxopt${F[k] === v ? " on" : ""}`}>
          <input type="radio" name={`dx${k}`} value={v} checked={F[k] === v} onChange={() => set(k, v as DlSetup[K])} />
          <span><b>{l}</b>{sub && <small>{sub}</small>}</span>
        </label>
      ))}
    </div>
  );
  const step = (n: number, title: string, help: string, body: React.ReactNode) => (
    <section className="dxstep"><span className="dxn">{n}</span><div className="dxsb"><h3>{title}</h3>{help && <p className="dxhelp">{help}</p>}{body}</div></section>
  );
  return (
    <div className="dxgrid">
      <div className="dxcard dxsetup">
        <div className="dxsh"><h2>{editing ? "Change your answers" : "Tell us about your business"}</h2><p>Five quick questions. We turn your answers into your CRA dates for the next 12 months.</p></div>
        {step(1, "Where is the business?", "", <label className="tlf" htmlFor="dl-p"><span>Province or territory</span><select id="dl-p" value={F.prov} onChange={(e) => set("prov", e.target.value)}>{TXR.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>)}
        {step(2, "How is it set up?", "", <>
          {opts("type", [["sole", "Sole proprietor or partnership", "Business income goes on your personal return"], ["corp", "Corporation", "The business files its own T2 return"]])}
          <label className="tlf" htmlFor="dl-y"><span>Fiscal year ends in</span><select id="dl-y" value={F.fye} onChange={(e) => set("fye", e.target.value)}>{MON.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}</select></label>
          {F.type === "sole" && F.fye !== "11" && <p className="dxhelp">Most sole proprietors use a December 31 year end.</p>}
        </>)}
        {step(3, `How often do you file ${tx}?`, "It’s in your CRA account or on your registration letter.", <>
          {opts("gst", [["none", "Not registered", "Under $30,000 a year"], ["annual", "Every year", ""], ["quarter", "Every quarter", ""], ["month", "Every month", ""]])}
          {F.gst === "annual" && <label className="dxcb"><input type="checkbox" checked={F.gstInst} onChange={(e) => set("gstInst", e.target.checked)} /> I pay {tx} by quarterly instalments</label>}
        </>)}
        {step(4, "Do you have employees?", "", opts("pay", [["none", "No employees", ""], ["regular", "Yes, I pay monthly", "Most small employers"], ["quarterly", "Yes, I pay quarterly", "Only if CRA told you so"]]))}
        {step(5, "Income tax instalments", `Only if you owed more than $3,000 last year${corp ? " (corporations: talk to your accountant)." : "."}`, corp
          ? <label className="dxcb"><input type="checkbox" checked={F.corpInst} onChange={(e) => set("corpInst", e.target.checked)} /> The corporation pays tax by quarterly instalments</label>
          : <label className="dxcb"><input type="checkbox" checked={F.taxInst} onChange={(e) => set("taxInst", e.target.checked)} /> I pay personal tax by quarterly instalments</label>)}
        {msg && <p className="small" role="alert" style={{ padding: "0 18px" }}>{msg}</p>}
        <div className="dxsf">
          <button type="button" className="btn dark" disabled={pending} onClick={() => start(async () => { const x = await saveDeadlineSetup(F); if (x.error) setMsg(x.error); else onSaved(P.length); })}><Ic n="cal2" s={15} />{editing ? "Save my answers" : "Create my deadlines"}</button>
          {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
        </div>
      </div>
      <aside className="dxside">
        <div className="dxcard dxprev">
          <p className="dxeye">Your calendar so far</p>
          <div className="dxbig"><b>{P.length}</b><span>dates in the next 12 months</span></div>
          <div className="dxcnt">{([["tax", tx], ["pay", "Payroll"], ["inc", "Income tax"]] as const).map(([k, l]) => <span key={k} style={{ "--c": DXC[k][1] } as React.CSSProperties}><i />{l}<b>{cnt[k]}</b></span>)}</div>
          <ul className="dxpl">{P.slice(0, 5).map((o) => <li key={o.key} style={{ "--c": DXC[o.cat][1] } as React.CSSProperties}><DateBlock iso={o.iso} cls="xs" /><span>{o.t}</span></li>)}</ul>
          {P.length > 5 && <p className="dxhelp">and {P.length - 5} more</p>}
        </div>
        <div className="dxcard dxpriv"><Ic n="lock" s={16} /><span><b>Only you can see this</b><small>Your deadlines never show on your profile.</small></span></div>
      </aside>
    </div>
  );
}

function AddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const d = new Date(); d.setDate(d.getDate() + 30);
  const [A, setA] = useState({ title: "", due: d.toISOString().slice(0, 10), rep: "none", note: "" });
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dlmt" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlmt" style={{ fontSize: 20 }}>Add my own deadline</h2>
        <div className="stack" style={{ gap: 12 }}>
          <label className="tlf" htmlFor="dla-t"><span>What is it?</span><span className="tlin"><input id="dla-t" type="text" value={A.title} onChange={(e) => setA({ ...A, title: e.target.value })} autoFocus /></span><small>For example: business licence renewal, insurance renewal, WSIB report</small></label>
          <label className="tlf" htmlFor="dla-d"><span>Date</span><input id="dla-d" type="date" value={A.due} onChange={(e) => setA({ ...A, due: e.target.value })} /></label>
          <label className="tlf" htmlFor="dla-r"><span>Repeats</span><select id="dla-r" value={A.rep} onChange={(e) => setA({ ...A, rep: e.target.value })}><option value="none">Does not repeat</option><option value="month">Every month</option><option value="quarter">Every 3 months</option><option value="year">Every year</option></select></label>
          <label className="tlf" htmlFor="dla-n"><span>Note (optional)</span><input id="dla-n" type="text" value={A.note} onChange={(e) => setA({ ...A, note: e.target.value })} /></label>
          {err && <p className="fserr" role="alert">{err}</p>}
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { const r = await addOwnDeadline(A); if (r.error) setErr(r.error); else onAdded(); })}>Add deadline</button>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** My deadlines (Update 38 redesign of Update 13): private to the member. Same saved data and actions as before. */
export function DeadlinesPage({ today, setup, done: done0, rem: rem0, custom, prov }: { today: string; setup: DlSetup | null; done: Record<string, boolean>; rem: DlRem; custom: DlCustom[]; prov?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!setup || !!prov);
  const [filter, setFilter] = useState<"all" | DlItem["cat"]>("all");
  const [view, setView] = useState<"list" | "year">("list");
  const [month, setMonth] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState(done0);
  const [rem, setRem] = useState(rem0);
  const [adding, setAdding] = useState(false);
  const [feed, setFeed] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => { setDone(done0); }, [done0]);
  const refresh = () => router.refresh();
  const head = (
    <div className="dxhead">
      <div>
        <p className="dxeye"><Ic n="lock" s={12} /> Only you can see this page</p>
        <h1>My deadlines</h1>
        <p className="dxsub">Your tax and filing dates for the next 12 months, with reminders before each one.</p>
      </div>
      {setup && !editing && (
        <div className="dxhb">
          <button type="button" className="btn sm dark" onClick={() => setAdding(true)}><Ic n="plus" s={14} />Add a deadline</button>
          <button type="button" className="btn sm ghost" onClick={() => icsAll()}><Ic n="cal2" s={14} />Add all to my calendar</button>
          <button type="button" className="btn sm ghost" onClick={() => setEditing(true)}>Change my answers</button>
        </div>
      )}
    </div>
  );
  if (!setup || editing) {
    const init = setup ? { ...setup, ...(prov ? { prov } : {}) } : dlDefault(prov ?? "ON");
    return (
      <div className="dxpage">
        {head}
        <Setup initial={init} editing={!!setup} today={today} onCancel={setup ? () => setEditing(false) : undefined}
          onSaved={(n) => { setEditing(false); toast(setup ? "Your answers are saved" : `${n} deadlines added. We’ll remind you before each one.`); refresh(); }} />
      </div>
    );
  }

  const A = dlGen(setup, custom, today, dxStart(today, setup.at));
  const over = A.filter((o) => o.iso < today && !done[o.key]);
  const up = A.filter((o) => o.iso >= today);
  const next = up.find((o) => !done[o.key]);
  const in30 = up.filter((o) => daysUntil(o.iso, today) <= 30 && !done[o.key]).length;
  const r = txr(setup.prov);
  const remDays = (["d14", "d7", "d1"] as const).filter((k) => rem[k]).map((k) => ({ d14: "14", d7: "7", d1: "1" })[k]);
  function icsAll() {
    const L = up.filter((o) => !done[o.key]);
    download(L, rem, "sme-hub-my-deadlines.ics");
    toast(`${L.length} deadlines downloaded. Open the file to add them to your calendar.`);
  }
  const icsOne = (o: DlItem) => { download([o], rem, `${slug(o.t)}-${o.iso}.ics`); toast(`Calendar file downloaded. Open it to add “${o.t}” to your calendar.`); };
  const mark = (k: string, on: boolean, msg?: string) => {
    setDone((d) => { const x = { ...d }; if (on) x[k] = true; else delete x[k]; return x; });
    start(async () => { const x = await setDeadlineDone(k, on); if (x.error) { toast(x.error); setDone((d) => { const y = { ...d }; if (on) delete y[k]; else y[k] = true; return y; }); } else if (msg) toast(msg); });
  };
  const remSet = (k: keyof DlRem, v: boolean) => { const n = { ...rem, [k]: v }; setRem(n); start(async () => { const x = await saveReminders(n); if (x.error) { setRem(rem); toast(x.error); } else toast("Reminder settings saved"); }); };

  const row = (o: DlItem) => {
    const c = DXC[o.cat], isDone = !!done[o.key], isOpen = open === o.key, n = daysUntil(o.iso, today);
    return (
      <li key={o.key} className={`dxrow${isDone ? " done" : ""}${isOpen ? " open" : ""}${n < 0 && !isDone ? " late" : ""}`} style={{ "--c": c[1] } as React.CSSProperties}>
        <div className="dxline">
          <DateBlock iso={o.iso} cls="sm" />
          <button type="button" className="dxmain" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.key)}>
            <span className="dxt"><i className="dxdot" aria-hidden="true" /><b>{o.t}</b></span>
            <small>{c[0]} · {longNoYear(o.iso)}{o.moved ? " · moved to the next business day" : ""}</small>
          </button>
          {isDone ? <span className="dxpill ok"><Ic n="check" s={12} />Done</span> : <span className={`dxpill${n < 0 ? " late" : n <= 7 ? " soon" : ""}`}>{dxIn(n)}</span>}
          <label className="dxchk" title="Mark as done">
            <input type="checkbox" checked={isDone} onChange={(e) => mark(o.key, e.target.checked, e.target.checked ? (n < 0 ? "Ticked off. It no longer shows as overdue" : "Marked as done") : undefined)} aria-label={`Done: ${o.t}`} />
            <span aria-hidden="true"><Ic n="check" s={13} /></span>
          </label>
          <button type="button" className="dxchev" aria-label={`${isOpen ? "Hide" : "Show"} details for ${o.t}`} onClick={() => setOpen(isOpen ? null : o.key)}><Ic n={isOpen ? "up" : "down"} s={16} /></button>
        </div>
        {isOpen && (
          <div className="dxmore">
            {o.dt && <p>{o.dt}</p>}
            {o.cat !== "own" && <><p className="dxhowh">How to do it</p><ol className="dxhow">{dxHow(o, setup).map((t) => <li key={t}>{t}</li>)}</ol></>}
            <div className="dxbtns">
              <button type="button" className="btn sm ghost" onClick={() => icsOne(o)}><Ic n="cal2" s={14} />Add to my calendar</button>
              {o.cat === "tax" && <Link className="btn sm ghost" href="/tools/gst"><Ic n="calc" s={14} />GST/HST calculator</Link>}
              {o.own && <button type="button" className="btn sm ghost dxdel" onClick={() => start(async () => { const x = await deleteOwnDeadline(o.own!); toast(x.error ?? "Deadline deleted"); refresh(); })}><Ic n="x" s={14} />Delete</button>}
            </div>
          </div>
        )}
      </li>
    );
  };

  // ---------- the list ----------
  let L = up.filter((o) => filter === "all" || o.cat === filter);
  let listBody: React.ReactNode;
  if (view === "year") {
    const t = new Date(`${today}T00:00:00Z`);
    listBody = (
      <div className="dxyear">
        {Array.from({ length: 12 }, (_, i) => {
          const m = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + i, 1));
          const y = m.getUTCFullYear(), mm = m.getUTCMonth(), key = `${y}-${mm}`;
          const items = L.filter((o) => Number(o.iso.slice(0, 4)) === y && mo(o.iso) === mm);
          return (
            <button key={key} type="button" className={`dxmon${items.length ? "" : " empty"}`} onClick={() => { setMonth(key); setView("list"); setAll(false); window.scrollTo(0, 0); }}>
              <span className="dxmh"><b>{MON[mm]}</b><small>{y}</small></span>
              {items.length ? (
                <span className="dxmi">
                  {items.slice(0, 4).map((o) => <span key={o.key} className={done[o.key] ? "d" : ""} style={{ "--c": DXC[o.cat][1] } as React.CSSProperties}><i />{day(o.iso)} · {o.t.replace(/ \(quarterly\)$/, "")}</span>)}
                  {items.length > 4 && <em>+{items.length - 4} more</em>}
                </span>
              ) : <span className="dxmi"><em>Nothing due</em></span>}
            </button>
          );
        })}
      </div>
    );
  } else {
    const parts: React.ReactNode[] = [];
    if (month) {
      const [y, mm] = month.split("-").map(Number);
      L = L.filter((o) => Number(o.iso.slice(0, 4)) === y && mo(o.iso) === mm);
      parts.push(<div key="mf" className="dxmf">Showing {MON[mm]} {y}<button type="button" className="linkbtn" onClick={() => setMonth(null)}>Show all months</button></div>);
    }
    if (!L.length) {
      parts.push(
        <div key="empty" className="dxcard dxempty">
          <b>Nothing here yet</b>
          <span>{filter === "own" ? "Add your own dates, like a licence renewal, an insurance renewal or a WSIB or WCB report." : "No dates in this view."}</span>
          {filter === "own" && <button type="button" className="btn sm dark" onClick={() => setAdding(true)}><Ic n="plus" s={14} />Add a deadline</button>}
        </div>,
      );
    } else {
      let lim = month || all ? L.length : 0;
      if (!lim) {
        const t = new Date(`${today}T00:00:00Z`);
        const cut = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 3, 1)).toISOString().slice(0, 10);
        lim = L.filter((o) => o.iso < cut).length;
        if (lim < 6) lim = Math.min(L.length, 6);
      }
      const groups: { m: string; items: DlItem[]; total: number }[] = [];
      for (const o of L.slice(0, lim)) {
        const m = `${MON[mo(o.iso)]} ${o.iso.slice(0, 4)}`;
        if (!groups.length || groups[groups.length - 1].m !== m) groups.push({ m, items: [], total: L.filter((x) => x.iso.slice(0, 7) === o.iso.slice(0, 7)).length });
        groups[groups.length - 1].items.push(o);
      }
      for (const g of groups) parts.push(<section key={g.m} className="dxmonth" aria-label={g.m}><h2>{g.m}<span>{g.total}{g.total === 1 ? " date" : " dates"}</span></h2><ul className="dxlist">{g.items.map(row)}</ul></section>);
      if (lim < L.length) parts.push(<button key="more" type="button" className="dxshow" onClick={() => setAll(true)}>Show the rest of the year <em>{L.length - lim} more</em><Ic n="down" s={15} /></button>);
      else if (all && !month) parts.push(<button key="less" type="button" className="dxshow" onClick={() => setAll(false)}>Show less<Ic n="up" s={15} /></button>);
    }
    listBody = parts;
  }

  const sw = (k: keyof DlRem, l: string, sub?: string) => (
    <label className="dxsw"><span><b>{l}</b>{sub && <small>{sub}</small>}</span><input type="checkbox" role="switch" checked={rem[k]} onChange={(e) => remSet(k, e.target.checked)} /><i aria-hidden="true" /></label>
  );
  const getFeed = (reset: boolean) => start(async () => {
    const x = await deadlineFeed(reset);
    if (x.error || !x.url) return toast(x.error ?? "Try again.");
    setFeed(x.url);
    try { await navigator.clipboard.writeText(x.url); toast(reset ? "New link made and copied. The old link no longer works" : "Calendar link copied. Paste it into Google, Outlook or Apple Calendar"); } catch { toast("Calendar link ready"); }
  });
  const nextN = next ? daysUntil(next.iso, today) : 0;
  return (
    <div className="dxpage">
      {head}
      <div className="dxkpis">
        <div className={over.length ? "bad" : ""}><small>Overdue</small><b>{over.length}</b><span>{over.length ? "Pay these first" : "You’re up to date"}</span></div>
        <div><small>Next 30 days</small><b>{in30}</b><span>{next ? `Next: ${MS[mo(next.iso)]} ${day(next.iso)}` : "Nothing due"}</span></div>
        <div><small>Next 12 months</small><b>{up.length}</b><span>CRA dates and your own</span></div>
        <div><small>Reminders</small><b className="dxsm">{remDays.join(", ") || "Off"}</b><span>{remDays.length ? `days before, ${rem.email && rem.bell ? "email and bell" : rem.email ? "by email" : rem.bell ? "in the bell" : "nowhere yet"}` : "Turn them on at the side"}</span></div>
      </div>
      <div className="dxgrid">
        <div className="dxcol">
          {over.length > 0 && (
            <section className="dxover" aria-label="Overdue">
              <div className="dxoh"><Ic n="alert" s={16} /><b>{over.length === 1 ? "1 deadline has passed" : `${over.length} deadlines have passed`}</b><span>Pay as soon as you can. Interest is charged daily on what you owe. Tick it off once it’s done.</span></div>
              <ul className="dxlist">{over.map(row)}</ul>
            </section>
          )}
          {next && (
            <section className="dxnext" style={{ "--c": DXC[next.cat][1] } as React.CSSProperties} aria-label="Next deadline">
              <div className="dxnl">
                <DateBlock iso={next.iso} cls="big" />
                <div className="dxring" style={{ "--p": `${Math.round((1 - Math.min(nextN, 30) / 30) * 100)}%` } as React.CSSProperties}>
                  <div><b>{nextN <= 0 ? (nextN === 0 ? "Today" : "Late") : nextN}</b><small>{nextN > 0 ? (nextN === 1 ? "day left" : "days left") : ""}</small></div>
                </div>
              </div>
              <div className="dxnm">
                <p className="dxeye">Next up · {DXC[next.cat][0]}</p>
                <h2>{next.t}</h2>
                <p className="dxnd">{dLong(next.iso)}{next.moved ? " (moved to the next business day)" : ""}</p>
                {next.cat !== "own" ? <ol className="dxhow light">{dxHow(next, setup).map((t) => <li key={t}>{t}</li>)}</ol> : next.dt ? <p className="dxnd">{next.dt}</p> : null}
                <div className="dxbtns">
                  <button type="button" className="btn sm dxwhite" onClick={() => mark(next.key, true, "Marked as done")}><Ic n="check" s={14} />Mark as done</button>
                  <button type="button" className="btn sm dxghostd" onClick={() => icsOne(next)}><Ic n="cal2" s={14} />Add to my calendar</button>
                </div>
              </div>
            </section>
          )}
          <div className="dxbar">
            <div className="dxseg" role="radiogroup" aria-label="View">
              {([["list", "List"], ["year", "Year at a glance"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => { setView(v); setMonth(null); }}><Ic n={v === "list" ? "list" : "cal2"} s={14} />{l}</button>
              ))}
            </div>
            <div className="dxchips" role="group" aria-label="Show">
              {(["all", "tax", "pay", "inc", "own"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); setOpen(null); }} style={k !== "all" ? ({ "--c": DXC[k][1] } as React.CSSProperties) : undefined}>
                  {k !== "all" && <i />}{k === "all" ? "All" : DXC[k][0]}<em>{k === "all" ? up.length : up.filter((o) => o.cat === k).length}</em>
                </button>
              ))}
            </div>
          </div>
          {listBody}
          <p className="dxfoot">Dates follow the CRA’s general rules for your answers. If a date falls on a weekend we show the next business day; public holidays can move it too. Your CRA account always shows your exact dates. This is not tax advice.{setup.prov === "QC" ? " In Québec, GST/QST is filed with Revenu Québec." : ""}</p>
        </div>
        <aside className="dxside">
          <div className="dxcard" id="reminders">
            <div className="dxch"><h2>Reminders</h2></div>
            {sw("email", "By email", "To your account email")}
            {sw("bell", "In the bell", "On SME Hub")}
            <p className="dxlab">When</p>
            <div className="dxwhen">
              {([["d14", "14 days"], ["d7", "7 days"], ["d1", "1 day"]] as const).map(([k, l]) => (
                <label key={k} className={rem[k] ? "on" : ""}><input type="checkbox" checked={rem[k]} onChange={(e) => remSet(k, e.target.checked)} />{l}</label>
              ))}
            </div>
            <p className="dxhelp">before each deadline</p>
            {sw("weekly", "Monday summary", "This week’s dates in your Monday email")}
          </div>
          <div className="dxcard">
            <div className="dxch"><h2>Your setup</h2><button type="button" className="linkbtn" onClick={() => setEditing(true)}>Change</button></div>
            <dl className="dxkv">
              {[["Province", `${r[1]} · ${txLabel(r[0])}`], ["Business", setup.type === "corp" ? "Corporation" : "Sole proprietor or partnership"],
                ["Year end", `${MON[Number(setup.fye)]} ${new Date(Date.UTC(2026, Number(setup.fye) + 1, 0)).getUTCDate()}`],
                [r[4] === "HST" ? "GST/HST" : "GST", `${{ none: "Not registered", annual: "Every year", quarter: "Every quarter", month: "Every month" }[setup.gst]}${setup.gstInst && setup.gst === "annual" ? ", with instalments" : ""}`],
                ["Payroll", { none: "No employees", regular: "Pays monthly", quarterly: "Pays quarterly" }[setup.pay]],
                ["Instalments", (setup.type === "corp" ? setup.corpInst : setup.taxInst) ? "Yes, quarterly" : "No"]].map(([a, b]) => <Fragment key={a}><dt>{a}</dt><dd>{b}</dd></Fragment>)}
            </dl>
          </div>
          <div className="dxcard dxsync">
            <Ic n="cal2" s={18} />
            <span><b>Put these in your calendar</b><small>Google, Outlook or Apple Calendar, with the same reminders.</small></span>
            <button type="button" className="btn sm ghost" onClick={icsAll}>Download</button>
            <div className="dxfeed">
              <small>Or subscribe, so changes reach your calendar by themselves:</small>
              {feed ? <><code>{feed.replace(/\/[^/]+\.ics$/, "/…ics")}</code><button type="button" className="linkbtn" onClick={() => getFeed(false)}>Copy link</button><button type="button" className="linkbtn" onClick={() => getFeed(true)}>Reset link</button></>
                : <button type="button" className="linkbtn" onClick={() => getFeed(false)}>Get my calendar link</button>}
            </div>
          </div>
          <div className="dxcard">
            <div className="dxch"><h2>Useful tools</h2></div>
            <Link href="/tools/gst" className="dxlink"><Ic n="calc" s={15} />GST/HST calculator</Link>
            <Link href="/tools/cashflow" className="dxlink"><Ic n="trend" s={15} />Cash-flow forecaster</Link>
            <Link href="/tools/payroll" className="dxlink"><Ic n="users" s={15} />Payroll cost calculator</Link>
            <Link href={`/guides/${slug(r[1])}`} className="dxlink"><Ic n="doc" s={15} />{r[1]} business guide</Link>
          </div>
        </aside>
      </div>
      {adding && <AddModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setFilter("all"); toast("Deadline added. We’ll remind you before it."); refresh(); }} />}
    </div>
  );
}
