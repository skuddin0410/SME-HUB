"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { addAdvisorTime, cancelAdvisorCall, removeAdvisorTime } from "@/app/(hub)/advisor-actions";
import { addAdvisor, saveAdvisorProfile } from "@/app/(hub)/team-extra-actions";
import { advWhen } from "@/lib/advisors";

export type TeamAdvisor = {
  id: string; name: string; avatar: string | null; headline: string;
  ap: { field: string; years: number; helped: number; rating: number | null; reply: string; langs: string; creds: string[]; services: { name: string; text: string }[]; session_title: string; session_at: string | null; active: boolean };
  slots: { id: string; at: string; minutes: number; booker: { id: string; name: string } | null; question: string }[];
  seats: number; reviews: number;
};

const local = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** One advisor's card on the team page: their advisor profile, and their call times and bookings. */
export function AdvisorCard({ a, staff }: { a: TeamAdvisor; staff: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [when, setWhen] = useState("");
  const [mins, setMins] = useState(15);
  const open = a.slots.filter((s) => !s.booker);
  const booked = a.slots.filter((s) => s.booker);
  return (
    <div className="card" id={`adv-${a.id}`}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <ZipAv name={a.name} src={a.avatar} />
        <div className="stack grow" style={{ gap: 2 }}><Link className="namebtn" href={`/members/${a.id}`}><strong>{a.name}</strong></Link><span className="muted small">{a.headline}</span></div>
        <span className={`pill ${a.ap.active ? "on" : ""}`}>{a.ap.active ? "Shown on the Hub" : "Hidden"}</span>
        <span className="muted small">{open.length} open · {booked.length} booked · {a.seats} seats saved · {a.reviews} reviews</span>
      </div>
      <details>
        <summary className="btn sm ghost" style={{ alignSelf: "flex-start" }}>Edit advisor profile</summary>
        <form className="setgrid" style={{ marginTop: 12 }} onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await saveAdvisorProfile(a.id, new FormData(e.currentTarget));
          setBusy(false);
          toast(r.error ?? "Advisor profile saved");
          if (!r.error) router.refresh();
        }}>
          <div className="stack" style={{ gap: 10 }}>
            <label>Field<input className="field" name="field" defaultValue={a.ap.field} maxLength={60} placeholder="Finance" /></label>
            <div className="row" style={{ gap: 8 }}>
              <label className="grow">Years<input className="field" type="number" name="years" min={0} max={80} defaultValue={a.ap.years} /></label>
              <label className="grow">Members helped<input className="field" type="number" name="helped" min={0} defaultValue={a.ap.helped} /></label>
            </div>
            {staff && <label>Rating shown <span className="muted small">(empty: average of reviews)</span><input className="field" name="rating" inputMode="decimal" defaultValue={a.ap.rating ?? ""} placeholder="4.8" /></label>}
            <label>Usual reply time<input className="field" name="reply" defaultValue={a.ap.reply} maxLength={40} placeholder="Same day" /></label>
            <label>Languages<input className="field" name="langs" defaultValue={a.ap.langs} maxLength={120} placeholder="English, French" /></label>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            <label>Credentials <span className="muted small">(one per line)</span><textarea className="field" name="creds" rows={3} defaultValue={a.ap.creds.join("\n")} /></label>
            <label>How they can help <span className="muted small">(one per line: Service: what it is)</span><textarea className="field" name="services" rows={4} defaultValue={a.ap.services.map((x) => `${x.name}: ${x.text}`).join("\n")} /></label>
            <label>Next live session<input className="field" name="session_title" defaultValue={a.ap.session_title} maxLength={120} placeholder="Year-end tax checklist for owners" /></label>
            <label>Session time (Toronto time)<input className="field" type="datetime-local" name="session_at" defaultValue={local(a.ap.session_at)} /></label>
            {staff && <label className="row" style={{ gap: 8 }}><input type="checkbox" name="active" defaultChecked={a.ap.active} />Show this advisor on the Hub</label>}
            <button type="submit" className="btn sm" disabled={busy} style={{ alignSelf: "flex-start" }}>Save advisor profile</button>
          </div>
        </form>
      </details>
      <div className="stack" style={{ gap: 8 }}>
        <strong className="small">Intro call times (Toronto time)</strong>
        <form className="row" style={{ gap: 8, flexWrap: "wrap" }} onSubmit={async (e) => {
          e.preventDefault();
          if (!when) return toast("Pick a date and time");
          const r = await addAdvisorTime(a.id, when, mins);
          if (r.error) return toast(r.error);
          setWhen("");
          toast("Time added");
          router.refresh();
        }}>
          <label className="sr" htmlFor={`t-${a.id}`}>New call time</label>
          <input id={`t-${a.id}`} className="field" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ maxWidth: 240 }} />
          <label className="sr" htmlFor={`m-${a.id}`}>Length</label>
          <select id={`m-${a.id}`} className="field" value={mins} onChange={(e) => setMins(Number(e.target.value))} style={{ maxWidth: 140 }}>
            {[15, 20, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
          <button type="submit" className="btn sm">Add time</button>
        </form>
        {open.length > 0 && (
          <div className="chips">
            {open.map((s) => (
              <span key={s.id} className="chip">{advWhen(s.at)} · {s.minutes} min
                <button type="button" className="iconbtn" aria-label={`Remove ${advWhen(s.at)}`} onClick={async () => { const r = await removeAdvisorTime(s.id); if (r.error) return toast(r.error); router.refresh(); }}>×</button>
              </span>
            ))}
          </div>
        )}
        {booked.length > 0 && (
          <div className="list">
            {booked.map((s) => (
              <div key={s.id} className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
                <span className="stack grow" style={{ gap: 2 }}>
                  <span><strong>{advWhen(s.at)}</strong> · booked by <Link className="namebtn" href={`/members/${s.booker!.id}`}>{s.booker!.name}</Link></span>
                  {s.question && <span className="small muted">“{s.question}”</span>}
                </span>
                <Link className="btn sm ghost" href={`/messages?with=${s.booker!.id}`}>Message</Link>
                <button type="button" className="btn sm ghost" onClick={async () => { const r = await cancelAdvisorCall(s.id); toast(r.error ?? "Call cancelled. The member has been told."); router.refresh(); }}>Cancel call</button>
              </div>
            ))}
          </div>
        )}
        {!a.slots.length && <p className="muted small">No upcoming times. Members see “no open times” on the profile until you add some.</p>}
      </div>
    </div>
  );
}

export function AddAdvisor({ candidates }: { candidates: { id: string; name: string; headline: string }[] }) {
  const router = useRouter();
  const [pick, setPick] = useState("");
  if (!candidates.length) return null;
  return (
    <div className="card">
      <h2>Add an advisor</h2>
      <p className="muted small">Members on the Advisor plan who do not have an advisor profile yet.</p>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="sr" htmlFor="advadd">Member</label>
        <select id="advadd" className="field" value={pick} onChange={(e) => setPick(e.target.value)} style={{ maxWidth: 360 }}>
          <option value="">Choose a member</option>
          {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}{c.headline ? ` · ${c.headline}` : ""}</option>)}
        </select>
        <button type="button" className="btn sm" disabled={!pick} onClick={async () => { const r = await addAdvisor(pick); toast(r.error ?? "Advisor added. Fill in their profile below."); if (!r.error) { setPick(""); router.refresh(); } }}>Add advisor</button>
      </div>
    </div>
  );
}
