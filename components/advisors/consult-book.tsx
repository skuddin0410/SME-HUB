"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { ZoomMark } from "@/components/zip/zoom-x";
import { toast } from "@/components/toast";
import { callSpan, callWhen, dayLabel, minLabel, torontoDayKey, type Slot } from "@/lib/consult";
import { bookConsult, cancelConsult, consultDays, holdTime, type BookedView } from "@/app/(hub)/consult-actions";

/**
 * Update 36: "Book a free 30-minute consultation" on an SME Advisor's profile (replaces the 15-minute intro call card).
 * Pick a day → pick a time → Next (the time is held for 5 minutes) → a short form → Book my free call.
 * Both people get an email with the Zoom link and a calendar invite.
 */
export type ConsultBookData = {
  advisorId: string; name: string; first: string; avatar: string | null;
  open: boolean; len: number; q: { biz: boolean; topic: boolean; web: boolean };
  days: [string, Slot[]][];
  viewer: { signedIn: boolean; email: string; name: string; biz: string; web: string };
  booked: BookedView | null;
};

const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

export function ConsultBook({ d }: { d: ConsultBookData }) {
  const router = useRouter();
  const [days, setDays] = useState(new Map(d.days));
  const [booked, setBooked] = useState<BookedView | null>(d.booked);
  const [moving, setMoving] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "form">("pick");
  const today = torontoDayKey(Date.now());
  const first = [...days.keys()].sort()[0] ?? today;
  const [ym, setYm] = useState(first.slice(0, 7));
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [f, setF] = useState({ biz: d.viewer.biz, topic: "", web: d.viewer.web });
  const [err, setErr] = useState("");
  const [mails, setMails] = useState(false);
  const [busy, start] = useTransition();
  const [myTz, setMyTz] = useState("");
  useEffect(() => {
    try {
      const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (z && z !== "America/Toronto" && new Date().toLocaleString("en-CA", { timeZone: z, hour: "numeric" }) !== new Date().toLocaleString("en-CA", { timeZone: "America/Toronto", hour: "numeric" })) setMyTz(z);
    } catch { /* keep Eastern only */ }
  }, []);

  const lenLabel = `${d.len}-minute`;
  const head = (
    <div className="zmbh">
      <div>
        <h2>Book a free {lenLabel} consultation</h2>
        <p className="muted small">On Zoom with {d.first}. No charge and no obligation. You both get the link and a calendar invite.</p>
      </div>
      <span className="zmfree">Free · {d.len} min</span>
    </div>
  );
  const ask = <div className="row" style={{ flexWrap: "wrap" }}><Link className="btn sm ghost" href={`/messages?with=${d.advisorId}`}><Ic n="msg" />Ask a question first</Link></div>;

  if (!d.open) {
    return <div className="card psec zmbook" id="advbook">{head}<p className="muted small" style={{ margin: 0 }}>{d.first} hasn’t opened times for free calls yet. Send a message and ask when suits.</p>{ask}</div>;
  }
  if (!d.viewer.signedIn) {
    return <div className="card psec zmbook" id="advbook">{head}<Link className="btn dark" href={`/auth/sign-up?next=/members/${d.advisorId}`} style={{ alignSelf: "flex-start" }}>Join free to book a call</Link></div>;
  }

  const refresh = () => start(async () => {
    const r = await consultDays(d.advisorId, moving ?? undefined);
    if (r.ok) setDays(new Map(r.days));
  });

  if (booked && !moving) {
    return (
      <div className="card psec zmbook" id="advbook">
        {head}
        <div className="zmok2" role="status">
          <b>✅ You’re booked: {callWhen(booked.at)}</b>
          <small>A confirmation is in your email{d.viewer.email ? ` (${d.viewer.email})` : ""} with the Zoom link and a calendar invite. {d.first} has your note too.</small>
        </div>
        <div className="zmacts">
          <a className="btn sm ghost" href={`/consult/${booked.id}/ics`}><Ic n="cal" s={14} />Add to calendar</a>
          <button type="button" className="btn sm ghost" onClick={() => setMails(true)}>✉ See the emails</button>
          <button type="button" className="btn sm ghost" onClick={() => { setMoving(booked.id); setStep("pick"); setDay(""); setSlot(null); setF({ biz: booked.biz, topic: booked.topic, web: d.viewer.web }); start(async () => { const r = await consultDays(d.advisorId, booked.id); if (r.ok) setDays(new Map(r.days)); }); toast("Pick a new time. Your old one is released when you book"); }}>Reschedule</button>
          <button type="button" className="btn sm ghost" disabled={busy} onClick={() => {
            if (!window.confirm(`Cancel your free call with ${d.name}? You both get an email, and the Zoom meeting is removed.`)) return;
            start(async () => {
              const r = await cancelConsult(booked.id);
              if (!r.ok) return toast(r.error);
              setBooked(null);
              toast(`Cancelled. You and ${d.first} both get an email, and the Zoom meeting is removed`);
              const x = await consultDays(d.advisorId);
              if (x.ok) setDays(new Map(x.days));
              router.refresh();
            });
          }}>Cancel</button>
        </div>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {booked.joinUrl && <a className="btn sm zmblue" href={booked.joinUrl} target="_blank" rel="noopener"><ZoomMark />Join the Zoom meeting</a>}
          <Link className="btn sm ghost" href={`/messages?with=${d.advisorId}`}><Ic n="msg" />Message {d.first}</Link>
        </div>
        {mails && <Emails d={d} b={booked} onClose={() => setMails(false)} />}
      </div>
    );
  }

  if (step === "form" && slot) {
    const book = () => {
      if (d.q.topic && !f.topic.trim()) return setErr("Write a sentence about what you would like to talk about.");
      if (d.q.biz && !f.biz.trim()) return setErr("Add your business.");
      if (d.q.web && !f.web.trim()) return setErr("Add your website.");
      setErr("");
      start(async () => {
        const r = await bookConsult(d.advisorId, slot.at, f, moving ?? undefined);
        if (!r.ok) {
          setErr(r.error);
          if (/taken|available|booking that time|day is full/i.test(r.error)) { setStep("pick"); setSlot(null); refresh(); toast(r.error); }
          return;
        }
        setBooked(r.booked);
        setMoving(null);
        setStep("pick");
        setDay("");
        setSlot(null);
        toast(moving ? `New time booked. Emails sent to you and ${d.first}` : `Booked. Emails sent to you and ${d.first}`);
        if (!moving) setMails(true);
        router.refresh();
      });
    };
    return (
      <div className="card psec zmbook" id="advbook">
        {head}
        <div className="zmsum">
          <ZipAv name={d.name} src={d.avatar} size="s" />
          <span><b>{d.name} · {d.len} min on Zoom</b><small>{callSpan(slot.at, d.len)}{myTz ? ` (${new Date(slot.at).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: myTz }).replace(/\./g, "")} your time)` : ""}</small></span>
          <button type="button" className="linkbtn" onClick={() => { setStep("pick"); setErr(""); }}>Change</button>
        </div>
        {!moving && (
          <>
            <label className="zmfl" htmlFor="zm-biz">Your business{d.q.biz ? "" : " (optional)"}</label>
            <input id="zm-biz" className="field" value={f.biz} maxLength={160} onChange={(e) => setF({ ...f, biz: e.target.value })} />
            <label className="zmfl" htmlFor="zm-topic">What would you like to talk about?{d.q.topic ? "" : " (optional)"}</label>
            <textarea id="zm-topic" className="field" rows={3} maxLength={600} value={f.topic} placeholder={`One or two sentences, so ${d.first} can prepare`}
              aria-invalid={!!err && /talk about/.test(err)} aria-describedby={err ? "zm-err" : undefined}
              onChange={(e) => { setF({ ...f, topic: e.target.value }); if (err) setErr(""); }} />
            {err && <p className="zmerr" id="zm-err" role="alert">{err}</p>}
            <label className="zmfl" htmlFor="zm-web">Your website{d.q.web ? "" : " (optional)"}</label>
            <input id="zm-web" className="field" type="url" value={f.web} maxLength={200} placeholder="https://" onChange={(e) => setF({ ...f, web: e.target.value })} />
          </>
        )}
        {moving && err && <p className="zmerr" role="alert">{err}</p>}
        <div className="zmacts">
          <button type="button" className="btn dark" onClick={book} disabled={busy}>{busy ? "Booking…" : moving ? "Book the new time" : "Book my free call"}</button>
          <button type="button" className="btn ghost" onClick={() => { setStep("pick"); setErr(""); }}>Back</button>
          {moving && <button type="button" className="btn ghost" onClick={() => { setMoving(null); refresh(); }}>Keep my time</button>}
        </div>
        <p className="small muted" style={{ margin: 0 }}>Your name and email come from your profile: {d.viewer.name}{d.viewer.email ? `, ${d.viewer.email}` : ""}</p>
      </div>
    );
  }

  // ---------- pick a day and a time ----------
  const [y, m] = ym.split("-").map(Number);
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const keys = [...days.keys()].sort();
  const last = keys[keys.length - 1] ?? today;
  const canPrev = ym > today.slice(0, 7);
  const canNext = ym < last.slice(0, 7);
  const shift = (n: number) => { const dt = new Date(Date.UTC(y, m - 1 + n, 1)); setYm(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`); };
  const slots = day ? days.get(day) ?? [] : [];
  const next = () => {
    if (!slot) return;
    start(async () => {
      const r = await holdTime(d.advisorId, slot.at, moving ?? undefined);
      if (!r.ok) { toast(r.error); setSlot(null); refresh(); return; }
      setStep("form");
    });
  };
  return (
    <div className="card psec zmbook" id="advbook">
      {head}
      {moving && <p className="small" style={{ margin: 0 }}>Moving your call on <b>{booked ? callWhen(booked.at) : ""}</b>. <button type="button" className="linkbtn" onClick={() => { setMoving(null); refresh(); }}>Keep my time</button></p>}
      <div className="zmbgrid">
        <div className="zmcal">
          <div className="zmcalh">
            <b>{MON[m - 1]} {y}</b>
            <span>
              <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => shift(-1)}>‹</button>
              <button type="button" aria-label="Next month" disabled={!canNext} onClick={() => shift(1)}>›</button>
            </span>
          </div>
          <div className="zmdow" aria-hidden="true">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((x) => <span key={x}>{x}</span>)}</div>
          <div className="zmdays">
            {Array.from({ length: firstDow }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: dim }, (_, i) => {
              const dd = i + 1;
              const key = `${ym}-${pad(dd)}`;
              const open = days.has(key);
              const isToday = key === today;
              const dow = DOW[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
              return open ? (
                <button key={key} type="button" className={`zmd a${day === key ? " sel" : ""}${isToday ? " today" : ""}`} aria-pressed={day === key}
                  aria-label={`${dow}, ${MONS[m - 1]} ${dd}, open`} onClick={() => { setDay(key); setSlot(null); }}>{dd}</button>
              ) : <span key={key} className={`zmd${isToday ? " today" : ""}`}>{dd}</span>;
            })}
          </div>
          <p className="zmtz">🌐 Times in Eastern Time (Toronto){myTz ? `. Your computer is set to ${myTz.split("/").pop()?.replace(/_/g, " ")}.` : ""}</p>
        </div>
        <div className="zmslots" aria-live="polite">
          {day ? (
            <>
              <b>{dayLabel(day)}</b>
              <small>{d.len}-minute call</small>
              {slots.length ? slots.map((s) => slot?.at === s.at ? (
                <div key={s.at} className="zmslot on"><span>{minLabel(s.m)}</span><button type="button" onClick={next} disabled={busy}>Next</button></div>
              ) : (
                <button key={s.at} type="button" className="zmslot" onClick={() => setSlot(s)}>{minLabel(s.m)}</button>
              )) : <p className="muted small">No times left on this day. Pick another.</p>}
            </>
          ) : <p className="muted small">Pick a highlighted day to see open times.</p>}
        </div>
      </div>
      {ask}
    </div>
  );
}

/** "The two emails that went out": what each person was sent, so the member sees exactly what happened. */
function Emails({ d, b, onClose }: { d: ConsultBookData; b: BookedView; onClose: () => void }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setRoot((document.querySelector(".zip") as HTMLElement | null) ?? document.body);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const when = callWhen(b.at);
  const me = d.viewer.name;
  const card = (c: string, top: string, big: string, rows: [string, string][]) => (
    <div className="zmmc"><div className={`zmmct ${c}`}><small>{top}</small><b>{big}</b></div><dl>{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></div>
  );
  const body = useMemo(() => (
    <div className="overlay" onClick={onClose}>
      <div className="modal zmmails" role="dialog" aria-modal="true" aria-labelledby="zmmt" onClick={(e) => e.stopPropagation()}>
        <h2 id="zmmt">The two emails that went out</h2>
        <p className="small muted">Sent the moment you booked. Each has the Zoom link and a calendar invite.</p>
        <div className="zmmgrid">
          <div className="zmmail">
            <div className="zmmh">From <b>SME Hub</b> · To <b>{me}</b><br />Subject: <b>Booked: free call with {d.name}, {when}</b></div>
            <div className="zmmb">
              <img className="zmmlogo" src="/img/bc-logo.png" alt="" />
              <h3>Your free consultation is booked</h3>
              {card("red", `Free consultation · ${b.minutes} min`, `${d.name}, SME Advisor`, [["When", when], ["Where", "Zoom, your link is below"], ["Your note", b.topic || "Not added"]])}
              <span className="btn zmblue wide"><ZoomMark />Join the Zoom meeting</span>
              <div className="zmatt">📎 <i>.ics</i> Calendar invite for Google, Outlook or Apple Calendar</div>
              <div className="zmchips"><span>Reschedule</span><span>Cancel</span><span>Message {d.first}</span></div>
              <p className="small muted" style={{ margin: 0 }}>We remind you a day and an hour before.</p>
            </div>
          </div>
          <div className="zmmail">
            <div className="zmmh">From <b>SME Hub</b> · To <b>{d.name}</b><br />Subject: <b>New booking: {me}, {when}</b></div>
            <div className="zmmb">
              <img className="zmmlogo" src="/img/bc-logo.png" alt="" />
              <h3>{me} booked a free call</h3>
              {card("blue", `New booking · ${b.minutes} min on Zoom`, when, [["Member", me], ["Business", b.biz || "Not added"], ["Meeting", "Zoom, added to their Zoom"]])}
              {b.topic && <blockquote className="zmq">“{b.topic}”</blockquote>}
              <span className="btn zmblue wide"><ZoomMark />Start the Zoom meeting</span>
              <div className="zmatt">📎 <i>.ics</i> Calendar invite · {me.split(" ")[0]} is added to <b>My leads</b></div>
              <div className="zmchips"><span>View profile</span><span>Reschedule</span><span>Cancel</span></div>
            </div>
          </div>
        </div>
        <div className="zmmfoot"><button type="button" className="btn dark" onClick={onClose} autoFocus>Done</button></div>
      </div>
    </div>
  ), [b, d, me, when, onClose]);
  if (!root) return null;
  return createPortal(body, root);
}
