"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ic } from "@/components/zip/ic";
import { addOwnDeadline, deleteOwnDeadline, saveDeadlineSetup, saveReminders, setDeadlineDone } from "@/app/(hub)/deadline-actions";
import { dLong, dlDefault, DLCAT, dlGen, dlWhen, daysUntil, MON, type DlCustom, type DlItem, type DlRem, type DlSetup } from "@/lib/deadlines";
import { TXR, txLabel, txr } from "@/lib/tools/data";

const mon = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" });
const day = (iso: string) => Number(iso.slice(8, 10));
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** Downloads one deadline as a calendar file for Google, Outlook or Apple Calendar. */
function ics(o: DlItem) {
  const d = o.iso.replace(/-/g, "");
  const next = new Date(`${o.iso}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  const e = next.toISOString().slice(0, 10).replace(/-/g, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SME Hub//My deadlines//EN", "BEGIN:VEVENT", `UID:${o.key.replace(/[^\w-]/g, "")}@smehub.ca`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`, `SUMMARY:${esc(o.t)}`, `DESCRIPTION:${esc(o.dt)}`, "BEGIN:VALARM", "TRIGGER:-P7D", "ACTION:DISPLAY", `DESCRIPTION:${esc(o.t)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  a.download = `${slug(o.t)}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Setup({ initial, onCancel, onSaved }: { initial: DlSetup; onCancel?: () => void; onSaved: () => void }) {
  const [F, setF] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof DlSetup>(k: K, v: DlSetup[K]) => setF((x) => ({ ...x, [k]: v }));
  const r = txr(F.prov), tx = r[4] === "HST" ? "GST/HST" : "GST", corp = F.type === "corp";
  const rad = <K extends "type" | "gst" | "pay">(label: string, k: K, opts: [string, string, string][]) => (
    <div className="dlrad" role="radiogroup" aria-label={label}>
      {opts.map(([v, l, s]) => (
        <label key={v} className={`dlr${F[k] === v ? " on" : ""}`}>
          <input type="radio" name={k} value={v} checked={F[k] === v} onChange={() => set(k, v as DlSetup[K])} />
          <span><b>{l}</b>{s && <small>{s}</small>}</span>
        </label>
      ))}
    </div>
  );
  return (
    <div className="card dlsetup">
      <h2>Tell us about your business</h2>
      <p className="muted small">Takes a minute. We turn your answers into a calendar of CRA dates. You can change them any time.</p>
      <div className="dlq"><h3>Where is the business?</h3>
        <label className="tlf" htmlFor="dl-p"><span>Province or territory</span><select id="dl-p" value={F.prov} onChange={(e) => set("prov", e.target.value)}>{TXR.map((t) => <option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
      </div>
      <div className="dlq"><h3>How is it set up?</h3>
        {rad("Business type", "type", [["sole", "Sole proprietor or partnership", "You report business income on your personal return"], ["corp", "Corporation", "The business files its own T2 return"]])}
        <label className="tlf" htmlFor="dl-y"><span>Fiscal year ends in</span><select id="dl-y" value={F.fye} onChange={(e) => set("fye", e.target.value)}>{MON.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}</select></label>
        {F.type === "sole" && F.fye !== "11" && <p className="small muted">Most sole proprietors use a December 31 year end.</p>}
      </div>
      <div className="dlq"><h3>How often do you file {tx}?</h3>
        <p className="small muted">It’s in your CRA account or on your GST/HST registration letter.</p>
        {rad(`${tx} filing`, "gst", [["none", "Not registered", "Sales under $30,000 a year"], ["annual", "Every year", ""], ["quarter", "Every quarter", ""], ["month", "Every month", ""]])}
        {F.gst === "annual" && <label className="dlchk"><input type="checkbox" checked={F.gstInst} onChange={(e) => set("gstInst", e.target.checked)} /> I pay {tx} by quarterly instalments</label>}
      </div>
      <div className="dlq"><h3>Do you have employees?</h3>
        {rad("Payroll", "pay", [["none", "No employees", ""], ["regular", "Yes, I remit monthly", "Most small employers (regular remitter)"], ["quarterly", "Yes, I remit quarterly", "CRA told you that you’re a quarterly remitter"]])}
      </div>
      <div className="dlq"><h3>Income tax</h3>
        {corp
          ? <label className="dlchk"><input type="checkbox" checked={F.corpInst} onChange={(e) => set("corpInst", e.target.checked)} /> The corporation pays tax by quarterly instalments</label>
          : <label className="dlchk"><input type="checkbox" checked={F.taxInst} onChange={(e) => set("taxInst", e.target.checked)} /> I pay personal tax by quarterly instalments</label>}
      </div>
      {msg && <p className="small" role="alert">{msg}</p>}
      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { const x = await saveDeadlineSetup(F); if (x.error) setMsg(x.error); else onSaved(); })}><Ic n="cal2" s={15} />Create my deadlines</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

function SideInfo() {
  return (
    <aside className="stack" style={{ gap: 14 }}>
      <div className="card"><h2 style={{ font: "800 16px var(--display)" }}>What you get</h2>
        <ul className="dlul"><li>A calendar of your GST/HST, payroll and income tax dates for 12 months</li><li>Reminders by email and in the bell, 7 days and 1 day before (you choose)</li><li>Your own deadlines too: licence renewals, insurance, WSIB or WCB reports</li><li>This week’s dates in your Monday email</li></ul>
      </div>
      <div className="card"><h2 style={{ font: "800 16px var(--display)" }}>Private to you</h2><p className="small muted" style={{ margin: 0 }}>Deadlines never show on your profile. Only you can see them.</p></div>
    </aside>
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

/** My deadlines (Update 13): private to the member; setup, the generated CRA dates, their own deadlines and reminders. */
export function DeadlinesPage({ today, setup, done: done0, rem: rem0, custom, prov }: { today: string; setup: DlSetup | null; done: Record<string, boolean>; rem: DlRem; custom: DlCustom[]; prov?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!setup || !!prov);
  const [filter, setFilter] = useState("all");
  const [done, setDone] = useState(done0);
  const [rem, setRem] = useState(rem0);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [, start] = useTransition();
  const refresh = () => router.refresh();
  const L = dlGen(setup, custom, today);
  const show = L.filter((o) => filter === "all" || o.cat === filter);
  const next = L.find((o) => !done[o.key]);
  const mark = (k: string, on: boolean) => { setDone((d) => { const x = { ...d }; if (on) x[k] = true; else delete x[k]; return x; }); setNote(on ? "Marked as done" : ""); start(async () => { await setDeadlineDone(k, on); }); };
  const remSet = (k: keyof DlRem, v: boolean) => { const r = { ...rem, [k]: v }; setRem(r); setNote("Reminder settings saved"); start(async () => { await saveReminders(r); }); };
  const head = (
    <div className="dlhead">
      <div className="stack" style={{ gap: 4 }}>
        <p className="eyebrow"><Ic n="lock" s={12} /> Only you can see this page</p>
        <h1 style={{ font: "800 30px var(--display)", margin: 0 }}>My deadlines</h1>
        <p className="muted" style={{ margin: 0 }}>Your tax and filing dates for the next 12 months, with reminders by email and in the bell.</p>
      </div>
      {setup && !editing && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn" onClick={() => setAdding(true)}><Ic n="plus" s={15} />Add my own deadline</button>
          <button type="button" className="btn ghost" onClick={() => setEditing(true)}>Change my answers</button>
        </div>
      )}
    </div>
  );
  if (!setup || editing) {
    const init = setup ? { ...setup, ...(prov ? { prov } : {}) } : dlDefault(prov ?? "ON");
    return <div className="dlpage">{head}<div className="dlgrid"><div><Setup initial={init} onCancel={setup ? () => setEditing(false) : undefined} onSaved={() => { setEditing(false); setNote("Deadlines added. We’ll remind you before each one."); refresh(); }} /></div><SideInfo /></div></div>;
  }
  const r = txr(setup.prov);
  let cur = "";
  const months: { m: string; items: DlItem[] }[] = [];
  for (const o of show) { const m = `${MON[Number(o.iso.slice(5, 7)) - 1]} ${o.iso.slice(0, 4)}`; if (m !== cur) { months.push({ m, items: [] }); cur = m; } months[months.length - 1].items.push(o); }
  return (
    <div className="dlpage">
      {head}
      <p className="sr" role="status">{note}</p>
      <div className="dlgrid">
        <div className="stack" style={{ gap: 16 }}>
          {next && (
            <div className="card dlnext">
              <p className="eyebrow">Next up</p>
              <div className="row" style={{ gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div className="dldate big" aria-hidden="true"><span>{mon(next.iso)}</span><b>{day(next.iso)}</b></div>
                <div className="stack grow" style={{ gap: 2 }}><h2>{next.t}</h2><p className="muted small" style={{ margin: 0 }}>{dLong(next.iso)} · {dlWhen(next.iso, today)}</p></div>
                <button type="button" className="btn sm ghost" onClick={() => mark(next.key, true)}>Mark as done</button>
              </div>
            </div>
          )}
          <div className="dlchips" role="group" aria-label="Show">
            {[["all", "All"], ["tax", "Sales tax"], ["pay", "Payroll"], ["inc", "Income tax"], ["own", "My own"]].map(([k, l]) => (
              <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l} <span className="muted">{k === "all" ? L.length : L.filter((o) => o.cat === k).length}</span></button>
            ))}
          </div>
          {!show.length && (
            <div className="card">
              <p className="muted" style={{ margin: 0 }}>Nothing here yet.{filter === "own" ? " Add your own deadlines, like a licence renewal, an insurance renewal or a WSIB or WCB report." : ""}</p>
              {filter === "own" && <button type="button" className="btn sm" style={{ alignSelf: "flex-start", marginTop: 10 }} onClick={() => setAdding(true)}>Add my own deadline</button>}
            </div>
          )}
          {months.map(({ m, items }) => (
            <section key={m} className="dlmonth" aria-label={m}>
              <h2>{m}</h2>
              <ul>
                {items.map((o) => {
                  const c = DLCAT[o.cat], isDone = !!done[o.key], n = daysUntil(o.iso, today);
                  return (
                    <li key={o.key} className={`dlrow${isDone ? " done" : ""}${n >= 0 && n <= 7 && !isDone ? " soon" : ""}`}>
                      <div className="dldate" aria-hidden="true"><span>{mon(o.iso)}</span><b>{day(o.iso)}</b></div>
                      <div className="dlmain">
                        <div className="dlt"><span className={`tag ${c[1]}`}>{c[0]}</span><h3>{o.t}</h3></div>
                        {o.dt && <p className="small muted">{o.dt}</p>}
                        <p className="dlmeta"><span>{dLong(o.iso)}</span><span className="dlsep" aria-hidden="true">·</span><span>{dlWhen(o.iso, today)}</span>{o.moved && <><span className="dlsep" aria-hidden="true">·</span><span>Moved to the next business day</span></>}</p>
                      </div>
                      <div className="dlact">
                        <label className="dldone"><input type="checkbox" checked={isDone} onChange={(e) => mark(o.key, e.target.checked)} /><span>Done</span></label>
                        <button type="button" className="iconbtn" aria-label={`Add ${o.t} to my calendar`} onClick={() => ics(o)}><Ic n="cal2" s={16} /></button>
                        {o.own && <button type="button" className="iconbtn" aria-label={`Delete ${o.t}`} onClick={() => start(async () => { await deleteOwnDeadline(o.own!); setNote("Deadline deleted"); refresh(); })}><Ic n="x" s={16} /></button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <p className="small muted">Dates follow the CRA’s general rules for your answers. If a date falls on a weekend or a public holiday we show the next business day. Your CRA account always shows your exact dates. Not tax advice.{setup.prov === "QC" ? " In Quebec, GST/QST is filed with Revenu Québec." : ""}</p>
        </div>
        <aside className="stack" style={{ gap: 14 }}>
          <div className="card">
            <h2 style={{ font: "800 16px var(--display)" }}>Your setup</h2>
            <div className="dlsum">
              {[["Province", `${r[1]} · ${txLabel(r[0])}`], ["Business", setup.type === "corp" ? "Corporation" : "Sole proprietor or partnership"], ["Year end", `${MON[Number(setup.fye)]} ${new Date(Date.UTC(2026, Number(setup.fye) + 1, 0)).getUTCDate()}`],
                [r[4] === "HST" ? "GST/HST" : "GST", { none: "Not registered", annual: "Annual", quarter: "Quarterly", month: "Monthly" }[setup.gst]], ["Payroll", { none: "No employees", regular: "Monthly remitter", quarterly: "Quarterly remitter" }[setup.pay]]].map(([a, b]) => (
                <div key={a}><span className="muted small">{a}</span><b>{b}</b></div>
              ))}
            </div>
            <button type="button" className="linkbtn" style={{ alignSelf: "flex-start" }} onClick={() => setEditing(true)}>Change my answers</button>
          </div>
          <div className="card" id="reminders">
            <h2 style={{ font: "800 16px var(--display)" }}>Reminders</h2>
            <p className="small muted" style={{ margin: "0 0 6px" }}>How we remind you before each deadline.</p>
            {([["email", "By email"], ["bell", "In the bell on SME Hub"]] as [keyof DlRem, string][]).map(([k, l]) => <label key={k} className="dlchk"><input type="checkbox" checked={rem[k]} onChange={(e) => remSet(k, e.target.checked)} /> {l}</label>)}
            <p className="small" style={{ margin: "10px 0 4px", fontWeight: 600 }}>When</p>
            {([["d14", "14 days before"], ["d7", "7 days before"], ["d1", "1 day before"]] as [keyof DlRem, string][]).map(([k, l]) => <label key={k} className="dlchk"><input type="checkbox" checked={rem[k]} onChange={(e) => remSet(k, e.target.checked)} /> {l}</label>)}
            <label className="dlchk"><input type="checkbox" checked={rem.weekly} onChange={(e) => remSet("weekly", e.target.checked)} /> Show this week’s deadlines in my Monday email</label>
          </div>
          <div className="card">
            <h2 style={{ font: "800 16px var(--display)" }}>Useful tools</h2>
            <Link href="/tools/gst" className="dllink"><Ic n="calc" s={15} />GST/HST calculator</Link>
            <Link href="/tools/cashflow" className="dllink"><Ic n="trend" s={15} />Cash-flow forecaster</Link>
            <Link href={`/guides/${slug(r[1])}`} className="dllink"><Ic n="doc" s={15} />{r[1]} business guide</Link>
          </div>
        </aside>
      </div>
      {adding && <AddModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setFilter("all"); setNote("Deadline added. We’ll remind you before it."); refresh(); }} />}
    </div>
  );
}
