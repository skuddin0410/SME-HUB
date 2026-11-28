"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { Scene } from "@/components/zip/events-x";
import { hostEvent, type HostForm } from "@/app/(hub)/event-actions";
import { EV_IMGS, EV_PROV, EV_TOPICS, EV_TYPES, EV_TZ } from "@/lib/events";
import { ZoomConnect, ZoomMark } from "@/components/zip/zoom-x";

const DRAFT = "smehub.hostDraft.v1";

/** Update 37: Host an event, for SME Advisors only. Everyone else sees what hosting needs. */
export function HostUpsell() {
  return (
    <div className="evup">
      <Ic n="crown" s={22} />
      <div>
        <b>Hosting events is for SME Advisors</b>
        <span>Advisors run webinars, workshops and meetups for owners across Canada on their own Zoom, free or paid, with registrations, reminders and emails handled for them.</span>
      </div>
      <div className="evupb">
        <Link className="btn sm dark" href="/membership-plans">See the Advisor plan</Link>
        <Link className="btn sm ghost" href="/help/become-advisor">How to become an Advisor</Link>
      </div>
    </div>
  );
}

/** `zoomAcct`: the Advisor's connected Zoom (Update 36), or null when it isn't connected yet. */
export function HostEventForm({ zoomAcct }: { zoomAcct: { email: string; type: number } | null }) {
  const router = useRouter();
  const [f, setF] = useState<HostForm>({ title: "", type: "Webinar", topic: "Money and tax", desc: "", date: "", start: "12:00", end: "13:00", tz: "ET", fmt: "online", link: "", venue: "", city: "", prov: "ON", paid: false, price: "", cap: "", img: "laptop", join: "zoom", wr: true, reg: true, rec: false, recording: "no", agree: false });
  const [busy, start] = useTransition();
  const [connect, setConnect] = useState(false);
  // connecting Zoom leaves the page for Zoom's sign-in: keep what was typed, and put it back on return
  useEffect(() => {
    try {
      const d = sessionStorage.getItem(DRAFT);
      if (d) { setF((x) => ({ ...x, ...(JSON.parse(d) as Partial<HostForm>) })); sessionStorage.removeItem(DRAFT); }
    } catch { /* nothing saved */ }
    const u = new URL(window.location.href);
    const z = u.searchParams.get("zoom");
    if (z) {
      toast(z === "connected" ? `Zoom connected${zoomAcct ? ` as ${zoomAcct.email}` : ""}` : z === "cancelled" ? "Zoom wasn’t connected" : "Zoom didn’t connect. Please try again.");
      u.searchParams.delete("zoom");
      window.history.replaceState(null, "", u.toString());
    }
  }, [zoomAcct]);
  const openConnect = () => {
    try { sessionStorage.setItem(DRAFT, JSON.stringify(f)); } catch { /* fine */ }
    setConnect(true);
  };
  const dur = (() => { const [a, b] = [f.start.split(":").map(Number), f.end.split(":").map(Number)]; return b[0] * 60 + b[1] - (a[0] * 60 + a[1]); })();
  const howJoin = () => (
    <>
      <p className="evfl">How will people join?</p>
      <div className="zmch" role="radiogroup" aria-label="How will people join?">
        <button type="button" role="radio" aria-checked={f.join === "zoom"} className={`zmopt${f.join === "zoom" ? " on" : ""}`} onClick={() => setF({ ...f, join: "zoom" })}>
          <em>Easiest</em>
          <b><ZoomMark />My Zoom account</b>
          <small>{zoomAcct ? `Connected as ${zoomAcct.email}. We create the meeting for you.` : "Connect once. We create the meeting for you."}</small>
        </button>
        <button type="button" role="radio" aria-checked={f.join === "link"} className={`zmopt${f.join === "link" ? " on" : ""}`} onClick={() => setF({ ...f, join: "link" })}>
          <b><Ic n="link" s={16} />Paste a link</b>
          <small>Teams, Google Meet or any meeting link. One link for everyone.</small>
        </button>
      </div>
      {f.join === "zoom" ? (
        !zoomAcct ? (
          <div className="zmneed"><ZoomMark /><span><b>Connect your Zoom first</b><small>One time only. After that, Zoom is ready for every event and free call.</small></span><button type="button" className="btn sm zmblue" onClick={openConnect}>Connect my Zoom</button></div>
        ) : (
          <>
            <div className="zmsets">
              {([["wr", "Waiting room"], ["reg", "Registered people only"], ["rec", "Record to my Zoom cloud"]] as const).map(([k, l]) => (
                <button key={k} type="button" className={`zmset${f[k] ? " on" : ""}`} aria-pressed={!!f[k]} onClick={() => setF({ ...f, [k]: !f[k] })}><i />{l}</button>
              ))}
            </div>
            <div className="zmprev">
              <span><small>What each attendee gets</small><b>{f.reg ? "Their own Join button 15 minutes before the start, plus reminders a day and an hour before." : "A Join button 15 minutes before the start, plus reminders a day and an hour before."}</b></span>
              <span className="zmtick"><ZoomMark />Join on Zoom</span>
            </div>
            {zoomAcct.type === 1 && dur > 40 && (
              <div className="zmwarn">⚠️<span><b>Heads-up:</b> free Zoom accounts end meetings at 40 minutes. This event is {dur} minutes, so check your Zoom plan.</span></div>
            )}
          </>
        )
      ) : input("link", "Meeting link (shown only to people who register)", "url", "https://")}
    </>
  );
  const set = (k: keyof HostForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const input = (k: keyof HostForm, label: string, type = "text", ph = "", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <>
      <label className="evfl" htmlFor={`evf-${k}`}>{label}</label>
      <input id={`evf-${k}`} className="field" type={type} value={String(f[k] ?? "")} placeholder={ph} onChange={set(k)} {...extra} />
    </>
  );
  const select = (k: keyof HostForm, label: string, opts: [string, string][]) => (
    <>
      <label className="evfl" htmlFor={`evf-${k}`}>{label}</label>
      <select id={`evf-${k}`} className="field" value={String(f[k])} onChange={set(k)}>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </>
  );
  const publish = () => {
    if (!f.agree) return toast("Please tick the box to agree to the provider terms");
    if (f.fmt === "online" && f.join === "zoom" && !zoomAcct) return toast("Connect your Zoom first, or choose Paste a link");
    start(async () => {
      const r = await hostEvent(f).catch(() => ({ ok: false as const, error: "Could not publish. Try again." }));
      if (!r.ok) return toast(r.error);
      toast("Your event is live on Hub Events");
      router.push(`/events/${r.slug}`);
    });
  };

  return (
    <div className="evfgrid">
      <div className="evbox evfbox">
        <h2>The basics</h2>
        {input("title", "Event title", "text", "For example: Cash flow for the slow season", { maxLength: 90, required: true })}
        <div className="evf2">
          <div>{select("type", "Type", EV_TYPES.map((t) => [t, t]))}</div>
          <div>{select("topic", "Topic", EV_TOPICS.map((t) => [t, t]))}</div>
        </div>
        <label className="evfl" htmlFor="evf-desc">What people will get from it</label>
        <textarea id="evf-desc" className="field" rows={4} maxLength={2000} value={f.desc} onChange={set("desc")} placeholder="Two or three sentences. What will they leave with?" />
        <h2>When</h2>
        <div className="evf3">
          <div>{input("date", "Date", "date")}</div>
          <div>{input("start", "Starts", "time")}</div>
          <div>{input("end", "Ends", "time")}</div>
        </div>
        {select("tz", "Time zone", Object.entries(EV_TZ).map(([k, [, l]]) => [k, l]))}
        <h2>Where</h2>
        <div className="evseg" role="radiogroup" aria-label="Where">
          {([["online", "Online"], ["inperson", "In person"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.fmt === v} onClick={() => setF({ ...f, fmt: v })}>{l}</button>
          ))}
        </div>
        {f.fmt === "online" ? (
          howJoin()
        ) : (
          <>
            {input("venue", "Venue", "text", "Name of the place")}
            <div className="evf2">
              <div>{input("city", "City")}</div>
              <div>{select("prov", "Province", Object.entries(EV_PROV))}</div>
            </div>
            <p className="small muted">Tip: for a private address, write &quot;Address sent after you register&quot;.</p>
          </>
        )}
        <h2>Tickets</h2>
        <div className="evseg" role="radiogroup" aria-label="Tickets">
          {([["free", "Free"], ["paid", "Paid"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={(f.paid ? "paid" : "free") === v} onClick={() => setF({ ...f, paid: v === "paid" })}>{l}</button>
          ))}
        </div>
        {f.paid && (
          <>
            {input("price", "Price per person, before HST ($)", "number", "25", { min: 1 })}
            <p className="small muted">People pay by card when they register. Before tickets go on sale, you and the Hub agree in writing on who sells them, fees, payouts, taxes and refunds.</p>
          </>
        )}
        {input("cap", "Spots available (leave empty for no limit)", "number", "50", { min: 1 })}
        <h2>Recording</h2>
        <p className="small muted">People need to know before they register.</p>
        <div className="polseg" role="radiogroup" aria-label="Recording">
          {([["no", "Not recorded"], ["yes", "Recorded for people who registered"], ["promo", "Recorded, and clips may promote future events"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.recording === v} className={f.recording === v ? "on" : ""} onClick={() => setF({ ...f, recording: v, ...(f.join === "zoom" ? { rec: v !== "no" } : {}) })}>{l}</button>
          ))}
        </div>
        {f.recording !== "no" && <p className="small muted">We show this on your event page. Give people a way to take part without being on camera, like the chat.</p>}
        <h2>Picture</h2>
        <div className="evimgs" role="radiogroup" aria-label="Picture">
          {EV_IMGS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={f.img === c} className="imgopt" onClick={() => setF({ ...f, img: c })} aria-label={`Picture ${c}`}>
              <Scene n={c} h={90} />
            </button>
          ))}
        </div>
        <label className={`polcb ev${f.agree ? " on" : ""}`}>
          <input type="checkbox" className="sr-only" checked={!!f.agree} onChange={(e) => setF({ ...f, agree: e.target.checked })} />
          <i aria-hidden="true"><Ic n="check" s={12} /></i>
          <span>I agree to the <Link href="/policies/provider-terms" target="_blank">Advisor, course and event provider terms</Link> and the <Link href="/policies/community-guidelines" target="_blank">Community guidelines</Link>.</span>
        </label>
        <div className="evfbtns">
          <button type="button" className="btn dark" onClick={publish} disabled={busy}>{busy ? "Publishing…" : "Publish event"}</button>
          <Link className="btn ghost" href="/events">Cancel</Link>
        </div>
      </div>
      <aside className="evbox evrules">
        <h2>Before you publish</h2>
        <ul>
          <li>Events are for small business owners: teach, share or bring people together.</li>
          <li>Sales pitches belong in offers, not events.</li>
          <li>Members can report an event. The Hub team removes events that break the <Link href="/policies/community-guidelines">community guidelines</Link>.</li>
          <li>Say who is running it, the price, and any sponsor or sales pitch.</li>
          <li>Use registration details only to run the event.</li>
          <li>You can cancel at any time. Everyone registered gets an email.</li>
          <li>Read the <Link href="/policies/provider-terms">provider terms</Link>.</li>
        </ul>
      </aside>
      {connect && <ZoomConnect next="/events/host" onClose={() => setConnect(false)} />}
    </div>
  );
}
