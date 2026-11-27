"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { SxRow, SxSec, SxSeg, SxSw } from "@/components/zip/settings-x";
import { CONSULT_BLOCKS, CONSULT_DAYS, type ConsultHours } from "@/lib/consult";
import { cancelConsult, disconnectGcal, disconnectZoom, saveConsultSettings, type ConsultPatch } from "@/app/(hub)/consult-actions";

/** Update 36: Zoom for SME Advisors. Connected apps, Free consultations, and the "Link your Zoom" moment. */
export const ZoomMark = ({ s = 18 }: { s?: number }) => <img className="zmi" src="/img/zoom.svg" alt="" width={s} height={s} />;

/** "Link your Zoom to SME Hub": what SME Hub will and won't do, then Zoom's own sign-in. */
export function ZoomConnect({ next, onClose }: { next: string; onClose: () => void }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const go = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    setRoot((document.querySelector(".zip") as HTMLElement | null) ?? document.body);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  useEffect(() => { go.current?.focus(); }, [root]);
  if (!root) return null;
  const perms: [boolean, string, string][] = [
    [true, "Create a meeting when you publish an event or someone books a free call", "Only for things you set up on SME Hub"],
    [true, "Give each person their own join link", "Links can’t be forwarded to strangers"],
    [true, "Move or cancel the meeting when you change your plans", "Everyone involved is told by email"],
    [false, "Never see your other meetings", "Or your recordings and contacts"],
  ];
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal zmconn" role="dialog" aria-modal="true" aria-labelledby="zmct" onClick={(e) => e.stopPropagation()}>
        <div className="zmcl">
          <div className="zmprog" aria-hidden="true"><i className="on" /><i className="on" /><i /></div>
          <div className="zmlink" aria-hidden="true">
            <span className="zmtile"><img src="/img/bc-logo.png" alt="" /></span>
            <span className="zmwire"><i>✓</i></span>
            <span className="zmtile"><img src="/img/zoom.svg" alt="" /></span>
          </div>
          <div>
            <h2 id="zmct">Link your Zoom to SME Hub</h2>
            <p>Step 2 of 3. Zoom’s own sign-in opens next, and you come straight back here.</p>
          </div>
        </div>
        <div className="zmcr">
          <h3>What SME Hub will do in your Zoom</h3>
          {perms.map(([ok, b, s]) => (
            <div key={b} className="zmperm">
              <span className={`zmic ${ok ? "ok" : "no"}`} aria-hidden="true">{ok ? "✓" : "✕"}</span>
              <span><b>{b}</b><small>{s}</small></span>
            </div>
          ))}
          <a ref={go} className="btn zmblue wide" href={`/api/apps/zoom/start?next=${encodeURIComponent(next)}`}><ZoomMark />Continue to Zoom</a>
          <p className="small muted" style={{ textAlign: "center", margin: 0 }}>Disconnect any time in Settings, then Connected apps.</p>
        </div>
      </div>
    </div>,
    root,
  );
}

const FLAG: Record<string, string> = {
  connected: "", cancelled: "Zoom wasn’t connected. You can try again any time.", failed: "Zoom didn’t connect. Please try again.",
  expired: "That took too long. Please try again.", setup: "Connecting Zoom is being set up. Please try again soon.", advisor: "Your own Zoom is for SME Advisors.",
};
const GFLAG: Record<string, string> = {
  connected: "Google Calendar connected. Busy times are hidden from your booking calendar.", cancelled: "Google Calendar wasn’t connected.",
  failed: "Google Calendar didn’t connect. Please try again.", expired: "That took too long. Please try again.", setup: "Google Calendar is being set up. Please try again soon.",
};

/** Shows the result of coming back from Zoom or Google once, then tidies the address bar. */
function useReturnFlags(zoomEmail: string | null) {
  useEffect(() => {
    const u = new URL(window.location.href);
    const z = u.searchParams.get("zoom"), g = u.searchParams.get("gcal");
    if (z) toast(z === "connected" ? `Zoom connected${zoomEmail ? ` as ${zoomEmail}` : ""}` : FLAG[z] ?? "");
    if (g && GFLAG[g]) toast(GFLAG[g]);
    if (z || g) {
      u.searchParams.delete("zoom");
      u.searchParams.delete("gcal");
      window.history.replaceState(null, "", u.toString());
    }
  }, [zoomEmail]);
}

export type AppsData = { advisor: boolean; zoom: { email: string; type: number } | null; gcal: { email: string } | null; gcalOn: boolean };

export function AppsSection({ d }: { d: AppsData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, start] = useTransition();
  const [gcalOn, setGcalOn] = useState(d.gcalOn && !!d.gcal);
  useReturnFlags(d.zoom?.email ?? null);
  const intro = "Link the apps you use with SME Hub.";
  if (!d.advisor) {
    return (
      <SxSec id="apps" title="Connected apps" intro={intro}>
        <div className="zmup"><ZoomMark /><span><b>Your own Zoom is for SME Advisors</b><small>Advisors connect Zoom for the events they host and the free consultations members book with them.</small></span><Link className="btn sm ghost" href="/membership-plans">See the Advisor plan</Link></div>
      </SxSec>
    );
  }
  const off = () => start(async () => {
    const r = await disconnectZoom();
    if (r.ok) { toast("Zoom disconnected. Your upcoming meetings stay in your Zoom"); router.refresh(); } else toast(r.error);
  });
  const gcal = () => {
    if (!d.gcal) { window.location.href = "/api/apps/google/start"; return; }
    const v = !gcalOn;
    setGcalOn(v);
    start(async () => {
      const r = await saveConsultSettings({ gcal: v });
      if (!r.ok) { setGcalOn(!v); toast(r.error); } else toast(v ? "Busy times in your calendar are hidden from members" : "Google Calendar busy times are off");
    });
  };
  return (
    <SxSec id="apps" title="Connected apps" intro={intro}>
      <SxRow title={<><ZoomMark /> Zoom</>} sub={d.zoom ? `Connected as ${d.zoom.email}. Used for your events and free consultations.` : "Not connected. Connect once for events and free calls."}>
        {d.zoom
          ? <button type="button" className="btn sm ghost" onClick={off} disabled={busy}>Disconnect</button>
          : <button type="button" className="btn sm zmblue" onClick={() => setOpen(true)}>Connect my Zoom</button>}
      </SxRow>
      <SxSw on={gcalOn} onClick={gcal} disabled={busy} title="Google Calendar: block my busy times"
        sub={d.gcal ? `Free consultation times that clash with your calendar are hidden. Connected as ${d.gcal.email || "your Google account"}.` : "Free consultation times that clash with your calendar are hidden. Turning this on opens Google’s sign-in."} />
      {d.gcal && (
        <p className="small muted sxnote">We only see when you are busy, never what is in your calendar. <button type="button" className="linkbtn" onClick={() => start(async () => { const r = await disconnectGcal(); if (r.ok) { setGcalOn(false); toast("Google Calendar disconnected"); router.refresh(); } })}>Disconnect Google Calendar</button></p>
      )}
      <SxRow title="Google Meet and Microsoft Teams" sub="Coming later. Paste a Meet or Teams link when you host for now."><span /></SxRow>
      {d.zoom && <p className="small muted sxnote">If you disconnect, your upcoming Zoom meetings stay in your Zoom, and we ask you to choose a new link for each event.</p>}
      {open && <ZoomConnect next="/settings/apps" onClose={() => setOpen(false)} />}
    </SxSec>
  );
}

export type ConsultSettingsData = {
  advisor: boolean;
  zoom: { email: string } | null;
  s: { len: number; gap: number; max_day: number; ahead: number; notice: number; hours: ConsultHours; q_biz: boolean; q_topic: boolean; q_web: boolean; reg_mail: "each" | "daily" } | null;
  bookingUrl: string;
  upcoming: { id: string; name: string; avatar: string | null; when: string; topic: string; memberId: string }[];
};

export function ConsultSection({ d }: { d: ConsultSettingsData }) {
  const router = useRouter();
  const [s, setS] = useState(d.s);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  useReturnFlags(d.zoom?.email ?? null);
  if (!d.advisor || !s) {
    return (
      <SxSec id="consult" title="Free consultations" intro="Members book a free call with SME Advisors.">
        {!d.advisor
          ? <div className="zmup"><Ic n="cal" s={18} /><span><b>Free consultations are for SME Advisors</b><small>Advisors set their hours once and members book a free call from their profile, with a Zoom link for both.</small></span><Link className="btn sm ghost" href="/membership-plans">See the Advisor plan</Link></div>
          : <p className="muted">Free consultations are almost ready. Please try again later.</p>}
      </SxSec>
    );
  }
  const put = (patch: ConsultPatch, ok?: string) => {
    const was = s;
    setS({ ...s, ...(patch as Partial<typeof s>) });
    start(async () => {
      const r = await saveConsultSettings(patch);
      if (!r.ok) { setS(was); toast(r.error); } else if (ok) toast(ok);
    });
  };
  const seg = (k: "len" | "gap" | "max_day" | "ahead" | "notice", opts: [string, string][], label: string) => (
    <SxSeg opts={opts} cur={String(s[k])} label={label} onPick={(v) => put({ [k]: Number(v) } as ConsultPatch)} />
  );
  const flip = (day: keyof ConsultHours, b: "am" | "pm") => put({ hours: { ...s.hours, [day]: { ...s.hours[day], [b]: !s.hours[day][b] } } });
  const Q: [("q_biz" | "q_topic" | "q_web"), string][] = [["q_biz", "Your business and what it does"], ["q_topic", "What would you like to talk about?"], ["q_web", "Your website"]];
  const copy = async () => {
    try { await navigator.clipboard.writeText(d.bookingUrl); toast("Booking page link copied"); } catch { toast(d.bookingUrl); }
  };
  const anyHours = CONSULT_DAYS.some(([k]) => s.hours[k].am || s.hours[k].pm);
  return (
    <SxSec id="consult" title="Free consultations" intro="Members book a free call with you from your profile.">
      <SxRow title="Meet on" sub={d.zoom ? `Zoom, connected as ${d.zoom.email}. A new meeting for each booking.` : "Connect Zoom so each booking gets its own meeting."}>
        {d.zoom ? <span className="zmok">● Connected</span> : <button type="button" className="btn sm zmblue" onClick={() => setOpen(true)}>Connect my Zoom</button>}
      </SxRow>
      <SxRow title="Length of each call">{seg("len", [["15", "15 min"], ["30", "30 min"], ["45", "45 min"]], "Length")}</SxRow>
      <div className="sxsub">
        <h3>When you are available (Eastern Time)</h3>
        {CONSULT_DAYS.map(([k, l]) => (
          <div key={k} className="sxrow zmday">
            <span className="sxl"><b>{l}</b></span>
            <span className="sxr">
              {(["am", "pm"] as const).map((b) => (
                <button key={b} type="button" className={`zmblk${s.hours[k][b] ? " on" : ""}`} aria-pressed={s.hours[k][b]} onClick={() => flip(k, b)}
                  aria-label={`${l}, ${CONSULT_BLOCKS[b][0]} to ${CONSULT_BLOCKS[b][1]}`}>
                  {CONSULT_BLOCKS[b][0]} – {CONSULT_BLOCKS[b][1]}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="sxsub">
        <h3>Rules</h3>
        <SxRow title="Gap between calls">{seg("gap", [["0", "None"], ["15", "15 min"], ["30", "30 min"]], "Gap")}</SxRow>
        <SxRow title="Most calls a day">{seg("max_day", [["2", "2"], ["3", "3"], ["5", "5"], ["0", "No limit"]], "Most calls")}</SxRow>
        <SxRow title="Members can book up to">{seg("ahead", [["14", "14 days"], ["30", "30 days"], ["60", "60 days"]], "Ahead")}</SxRow>
        <SxRow title="Shortest notice">{seg("notice", [["4", "4 hours"], ["12", "12 hours"], ["24", "1 day"]], "Notice")}</SxRow>
      </div>
      <div className="sxsub">
        <h3>Questions members answer</h3>
        {Q.map(([k, l]) => (
          <SxRow key={k} title={l}><SxSeg opts={[["1", "Required"], ["0", "Optional"]]} cur={s[k] ? "1" : "0"} label="Required or optional" onPick={(v) => put({ [k]: v === "1" } as ConsultPatch)} /></SxRow>
        ))}
      </div>
      <div className="sxsub">
        <h3>Emails to you</h3>
        <SxRow title="When someone books a free call"><span className="small muted">Every time, with their question</span></SxRow>
        <SxRow title="When someone registers for your event">
          <SxSeg opts={[["each", "Every time"], ["daily", "Daily summary"]]} cur={s.reg_mail} label="Registration emails" onPick={(v) => put({ reg_mail: v as "each" | "daily" })} />
        </SxRow>
      </div>
      {d.zoom && anyHours ? (
        <div className="zmlive2"><span className="zmdot" /><b>Your booking page is live</b><span className="zmurl">{d.bookingUrl.replace(/^https?:\/\//, "")}</span><button type="button" className="linkbtn" onClick={copy}>Copy link</button></div>
      ) : (
        <p className="small muted sxnote">{d.zoom ? "Open at least one block of time and members can book you." : "Connect Zoom and members can book you from your profile."}</p>
      )}
      <div className="sxsub">
        <h3>Upcoming free calls</h3>
        {d.upcoming.length ? d.upcoming.map((b) => (
          <div key={b.id} className="sxrow">
            <span className="sxl" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ZipAv name={b.name} src={b.avatar} size="s" />
              <span style={{ display: "flex", flexDirection: "column" }}><Link href={`/members/${b.memberId}`} style={{ color: "inherit" }}><b>{b.name}</b></Link><small>{b.when}{b.topic ? ` · ${b.topic}` : ""}</small></span>
            </span>
            <span className="sxr">
              <a className="btn sm zmblue" href={`/consult/${b.id}/start`} target="_blank" rel="noopener"><ZoomMark />Start</a>
              <button type="button" className="btn sm ghost" onClick={() => {
                if (!window.confirm(`Cancel the free call with ${b.name}? They get an email with a link to pick a new time.`)) return;
                start(async () => { const r = await cancelConsult(b.id); if (r.ok) { toast(`Cancelled. ${b.name.split(" ")[0]} gets an email, and the Zoom meeting is removed`); router.refresh(); } else toast(r.error); });
              }}>Cancel</button>
            </span>
          </div>
        )) : <p className="small muted" style={{ margin: "4px 0 0" }}>No free calls booked yet.</p>}
      </div>
      {open && <ZoomConnect next="/settings/consultations" onClose={() => setOpen(false)} />}
    </SxSec>
  );
}
