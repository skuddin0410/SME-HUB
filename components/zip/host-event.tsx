"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { Scene } from "@/components/zip/events-x";
import { hostEvent, type HostForm } from "@/app/(hub)/event-actions";
import { EV_IMGS, EV_PROV, EV_TOPICS, EV_TYPES, EV_TZ } from "@/lib/events";

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

export function HostEventForm({ zoom }: { zoom?: React.ReactNode }) {
  const router = useRouter();
  const [f, setF] = useState<HostForm>({ title: "", type: "Webinar", topic: "Money and tax", desc: "", date: "", start: "12:00", end: "13:00", tz: "ET", fmt: "online", link: "", venue: "", city: "", prov: "ON", paid: false, price: "", cap: "", img: "laptop" });
  const [busy, start] = useTransition();
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
  const publish = () =>
    start(async () => {
      const r = await hostEvent(f).catch(() => ({ ok: false as const, error: "Could not publish. Try again." }));
      if (!r.ok) return toast(r.error);
      toast("Your event is live on Hub Events");
      router.push(`/events/${r.slug}`);
    });

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
          zoom ?? input("link", "Meeting link (shown only to people who register)", "url", "https://")
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
            <p className="small muted">People pay by card when they register. The Hub team confirms payout details with you before your first paid event.</p>
          </>
        )}
        {input("cap", "Spots available (leave empty for no limit)", "number", "50", { min: 1 })}
        <h2>Picture</h2>
        <div className="evimgs" role="radiogroup" aria-label="Picture">
          {EV_IMGS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={f.img === c} className="imgopt" onClick={() => setF({ ...f, img: c })} aria-label={`Picture ${c}`}>
              <Scene n={c} h={90} />
            </button>
          ))}
        </div>
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
          <li>You can cancel at any time. Everyone registered is told.</li>
        </ul>
      </aside>
    </div>
  );
}
