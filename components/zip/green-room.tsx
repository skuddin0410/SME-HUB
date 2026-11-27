"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { ZoomMark } from "@/components/zip/zoom-x";
import { sendEventNote, wrapFollowUp } from "@/app/(hub)/event-actions";

/** Update 36: the host's green room, from 15 minutes before: camera check, who is registered, quick notes, Go live. */
export type GreenRoomData = {
  id: string; slug: string; title: string; when: string; startsAt: string; hostName: string; hostAvatar: string | null;
  registered: number; reminders: number; faces: { name: string; avatar: string | null }[];
};
const NOTES = ["Starting in 5 minutes", "Running a little late", "Slides are in the chat"];
const fmtLeft = (ms: number) => {
  if (ms <= 0) return "Now";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm} min`;
};

export function GreenRoom({ d }: { d: GreenRoomData }) {
  const [now, setNow] = useState(() => Date.now());
  const [sent, setSent] = useState("");
  const [cam, setCam] = useState(false);
  const [busy, start] = useTransition();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("zoom") === "failed") {
      toast("Zoom didn’t open. Check Connected apps, then try again");
      u.searchParams.delete("zoom");
      window.history.replaceState(null, "", u.toString());
    }
  }, []);
  const left = Date.parse(d.startsAt) - now;
  const toggleCam = async () => {
    if (cam) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.current = s;
      setCam(true);
      requestAnimationFrame(() => { if (video.current) video.current.srcObject = s; });
    } catch {
      toast("Your browser didn’t allow the camera. You can still go live on Zoom");
    }
  };
  const note = (t: string) => start(async () => {
    const r = await sendEventNote(d.id, t);
    if (r.ok) { setSent(t); toast(`Sent to everyone registered: “${t}”`); } else toast(r.error);
  });
  const lobby = left > 15 * 60000;
  return (
    <div className="zmgr">
      <Link className="evback zmback" href={`/events/${d.slug}`}>← Back to the event page</Link>
      <div className="zmgrid">
        <div className="zmstage">
          <div className="zmvid">
            {cam ? <video ref={video} autoPlay playsInline muted aria-label="Your camera preview" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
              : d.hostAvatar ? <img src={d.hostAvatar} alt="Your profile photo" /> : <div style={{ display: "grid", placeItems: "center", height: "100%" }}><ZipAv name={d.hostName} size="xl" /></div>}
            <span className="zmlive"><i />Not live yet</span>
            <span className="zmname">{d.hostName} · Host</span>
            <button type="button" className="btn sm" onClick={toggleCam} style={{ position: "absolute", right: 12, bottom: 12, background: "rgba(0,0,0,.55)", color: "#fff", borderColor: "rgba(255,255,255,.35)" }}>{cam ? "Turn camera off" : "Check my camera"}</button>
          </div>
          <div className="zmlobby">
            <span className="zmfaces">
              {d.faces.map((f, i) => <ZipAv key={i} name={f.name} src={f.avatar} size="s" />)}
              {d.registered > d.faces.length && <span className="zmmore">+{d.registered - d.faces.length}</span>}
            </span>
            <span>
              <b>{d.registered} registered</b>
              <small>{lobby ? "They wait here from 15 minutes before. You let them in when you start." : "They can join now. With a waiting room, you let them in when you start."}</small>
            </span>
          </div>
        </div>
        <div className="zmside">
          <p className="zmeye">Green room</p>
          <h1>{d.title}</h1>
          <p className="zmwhen">{d.when}</p>
          <div className="zmcount"><b>{fmtLeft(left)}</b><small>until the start</small></div>
          <div className="zmstats">
            <div><b>{d.registered}</b><small>registered</small></div>
            <div><b>{d.reminders}</b><small>get a reminder</small></div>
          </div>
          <p className="zmlab">Quick note to everyone registered</p>
          <div className="zmquick">
            {NOTES.map((t) => <button key={t} type="button" className={sent === t ? "on" : ""} disabled={busy} onClick={() => note(t)}>✉ {t}</button>)}
          </div>
          <a className="btn zmblue wide zmgo" href={`/events/${d.slug}/start`} target="_blank" rel="noopener"><ZoomMark />Go live on Zoom</a>
          <Link className="small zmend" href={`/events/${d.slug}/wrap-up`}>See the wrap-up after the event</Link>
        </div>
      </div>
    </div>
  );
}

export type WrapData = { id: string; slug: string; title: string; registered: number; attended: number | null; minutes: number | null; talk: number; recording: string | null; rec: boolean; ended: boolean };

/** Update 36: the wrap-up after the event: who came, for how long, who asked to talk, and three follow-ups. */
export function WrapUp({ d }: { d: WrapData }) {
  const [busy, start] = useTransition();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const go = (what: "recording" | "thanks", ok: string) => start(async () => {
    const r = await wrapFollowUp(d.id, what);
    if (r.ok) { setDone({ ...done, [what]: true }); toast(ok); } else toast(r.error);
  });
  const pct = d.attended !== null && d.registered ? Math.round((d.attended / d.registered) * 100) : 0;
  return (
    <div className="evpage zmwrap">
      <Link className="evback" href={`/events/${d.slug}`}>← Back to the event page</Link>
      <section className="evbox">
        <p className="zmeye">{d.ended ? "Event wrapped" : "Wrap-up"}</p>
        {!d.ended ? (
          <>
            <h1>{d.title}</h1>
            <p className="muted" style={{ margin: 0 }}>The wrap-up fills in after the event ends: who came, for how long, and who asked to talk to you.</p>
          </>
        ) : (
          <>
            <h1>{d.attended !== null ? `${d.attended} of ${d.registered} people came` : `${d.registered} people registered`}</h1>
            {d.attended !== null && <div className="zmbar" role="img" aria-label={`${d.attended} of ${d.registered} came`}><i style={{ width: `${pct}%` }} /></div>}
            <div className="zmkpis">
              <div><b>{d.minutes ?? "–"}</b><small>minutes</small></div>
              <div><b>{d.registered}</b><small>registered</small></div>
              <div><b>{d.talk}</b><small>asked to talk</small></div>
            </div>
            <div className="zmtodo">
              {d.rec && (
                <div>🎬 <span>{d.recording ? "Recording is in your Zoom cloud" : "Zoom is still preparing the recording"}</span>
                  <button type="button" className="linkbtn" disabled={busy || !d.recording || done.recording} onClick={() => go("recording", "Recording link shared with everyone who registered")}>{done.recording ? "Shared" : "Share"}</button>
                </div>
              )}
              <div>✉ <span>Thank-you note to {d.attended !== null ? `all ${d.registered} registered` : "everyone registered"}</span>
                <button type="button" className="linkbtn" disabled={busy || done.thanks} onClick={() => go("thanks", "Thank-you note sent")}>{done.thanks ? "Sent" : "Send"}</button>
              </div>
              <div>⭐ <span>{d.talk ? `${d.talk} ${d.talk === 1 ? "person" : "people"} asked to talk. They are in My leads` : "Nobody has asked to talk yet. People see the tick box on the event page"}</span><Link className="linkbtn" href="/leads">Open</Link></div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              {d.attended === null ? "Zoom shares attendance after the meeting on paid Zoom plans. If it doesn’t show here within an hour, your plan doesn’t include it." : "Attendance and minutes come from Zoom. “Asked to talk” comes from the tick box people who registered see on the event page after it ends."}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
