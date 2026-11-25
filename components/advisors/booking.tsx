"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { bookAdvisor, cancelAdvisorCall, reviewAdvisor, toggleSeat } from "@/app/(hub)/advisor-actions";
import { advWhen, type AdvSlot } from "@/lib/advisors";

/** "Book a free 15-minute intro call" (handoff: advSections): open times as chips, an optional question, and the booked state. */
export function AdvisorBooking({ advisorId, first, slots, booked, member }: { advisorId: string; first: string; slots: AdvSlot[]; booked: { id: string; at: string } | null; member: boolean }) {
  const router = useRouter();
  const [pick, setPick] = useState<AdvSlot | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; at: string } | null>(booked);
  const book = async () => {
    if (!pick) return;
    setBusy(true);
    const r = await bookAdvisor(pick.id, q);
    setBusy(false);
    if (r.error) { toast(r.error); router.refresh(); return; }
    setDone({ id: pick.id, at: pick.at });
    setPick(null);
    toast(`Call booked with ${first}`);
    router.refresh();
  };
  return (
    <div className="card psec" id="advbook">
      <h2>Book a free 15-minute intro call</h2>
      {done ? (
        <>
          <div className="booked"><strong>Call booked.</strong> {advWhen(done.at)}. {first} has been told in the Hub and will send a video link.</div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Link className="btn sm ghost" href={`/messages?with=${advisorId}`}><Ic n="msg" />Message {first}</Link>
            <button type="button" className="btn sm ghost" onClick={async () => { const r = await cancelAdvisorCall(done.id); if (r.error) return toast(r.error); setDone(null); toast("Call cancelled"); router.refresh(); }}>Cancel the call</button>
          </div>
        </>
      ) : (
        <>
          {slots.length ? (
            <>
              <p className="muted">Pick a time. No charge and no obligation.</p>
              <div className="slots">
                {slots.map((s) => member
                  ? <button key={s.id} type="button" className="chip" aria-pressed={pick?.id === s.id} onClick={() => setPick(s)}>{advWhen(s.at)}</button>
                  : <Link key={s.id} className="chip" href="/auth/sign-up">{advWhen(s.at)}</Link>)}
              </div>
              {pick && (
                <div className="stack" style={{ gap: 8 }}>
                  <label htmlFor="advq">What would you like to talk about? <span className="muted small">(optional)</span>
                    <textarea id="advq" className="field" rows={2} maxLength={500} value={q} onChange={(e) => setQ(e.target.value)} placeholder="One or two sentences help them prepare." />
                  </label>
                  <div className="row"><button type="button" className="btn sm" disabled={busy} onClick={book}><Ic n="cal" />Book {advWhen(pick.at)}</button><button type="button" className="btn sm ghost" onClick={() => setPick(null)}>Cancel</button></div>
                </div>
              )}
            </>
          ) : <p className="muted">{first} has no open times right now. Ask a question first, or check back soon.</p>}
        </>
      )}
      <div className="row" style={{ flexWrap: "wrap" }}>
        <Link className="btn sm ghost" href={member ? `/messages?with=${advisorId}` : "/auth/sign-up"}><Ic n="msg" />Ask a question first</Link>
      </div>
    </div>
  );
}

export function SeatButton({ advisorId, initial, member }: { advisorId: string; initial: boolean; member: boolean }) {
  const [on, setOn] = useState(initial);
  if (!member) return <Link className="btn sm ghost" href="/auth/sign-up">Save my seat</Link>;
  return (
    <button type="button" className="btn sm ghost" aria-pressed={on} onClick={async () => {
      setOn(!on);
      const r = await toggleSeat(advisorId, !on);
      if (r.error) { setOn(on); toast(r.error); } else toast(on ? "Seat released" : "Seat saved. We will remind you before the session.");
    }}>{on ? "✓ Seat saved" : "Save my seat"}</button>
  );
}

export function ReviewAdvisor({ advisorId, first }: { advisorId: string; first: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  return (
    <div className="stack" style={{ gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
      <strong className="small">You had a call with {first}. How was it?</strong>
      <div className="row" role="radiogroup" aria-label="Rating" style={{ gap: 4 }}>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} className="iconbtn" style={{ color: n <= stars ? "#F59E0B" : "var(--muted)", fontSize: 20 }} onClick={() => setStars(n)}>★</button>)}
      </div>
      <label className="sr" htmlFor="advrev">Your review</label>
      <textarea id="advrev" className="field" rows={2} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did the call help you with?" />
      <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={async () => { const r = await reviewAdvisor(advisorId, stars, body); if (r.error) return toast(r.error); toast("Thanks for your review"); router.refresh(); }}>Post review</button>
    </div>
  );
}
