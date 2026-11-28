"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { setEventReminder, cancelHostedEvent, retryEventZoom, askToTalk } from "@/app/(hub)/event-actions";
import { ZoomMark } from "@/components/zip/zoom-x";
import { evPrice, evWhen, evWhere, type EvHost } from "@/lib/events";
import { EvCard, EvDate, EvGoBtn, EvHostIc, EvSaveBtn, EvTags, Scene, useEvActions, type EvItem, type EvMine } from "@/components/zip/events-x";

/** Update 35: one event's page: about, agenda, who's going, the host; time, place, price, Register and Save,
 *  Add to my calendar (Google, Outlook, .ics), Copy link, and per-event reminders. */
/** Update 36: an event on the host's own Zoom. `host` only for the host; `talked` once they asked to talk after it. */
export type EvZoomView = { host: { meetingId: string | null; status: "" | "ok" | "pending"; wr: boolean; reg: boolean; rec: boolean } | null; talked: boolean };

export function EventPage({
  e, mine, signedIn, similar, faces, cal, link, site, hostCard, zoom,
}: {
  e: EvItem; mine: EvMine; signedIn: boolean; similar: EvItem[]; faces: { name: string; avatar: string | null }[];
  cal: { google: string; outlook: string } | null; link: string | null; site: string; hostCard: EvHost | null; zoom?: EvZoomView | null;
}) {
  const a = useEvActions(mine, signedIn);
  const [calOpen, setCalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rem, setRem] = useState(mine.rem[e.id] ?? { week: false, day: true, hour: true });
  const saved = a.saved.has(e.id) || a.going.has(e.id);
  const going = a.going.has(e.id);
  const left = e.cap ? Math.max(0, e.cap - e.going) : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const startAt = e.starts_at ? Date.parse(e.starts_at) : 0;
  const endAt = e.ends_at ? Date.parse(e.ends_at) : startAt + 3600_000;
  const ended = !!startAt && now > endAt;

  const flip = async (k: "week" | "day" | "hour") => {
    const next = { ...rem, [k]: !rem[k] };
    setRem(next);
    const r = await setEventReminder(e.id, k, next[k]).catch(() => ({ ok: false as const, error: "Could not save that." }));
    if (!r.ok) {
      setRem(rem);
      toast(r.error);
    }
  };

  return (
    <div className="evpage evd">
      <Link className="evback" href="/events">← All events</Link>
      {e.cancelled_at && <div className="warnbox"><Ic n="flag" s={16} /><span>This event was cancelled.</span></div>}
      <div className="evdhero">
        <div className="evdart" aria-hidden="true"><Scene n={e.img} h={220} /></div>
        <div className="evdtop">
          <EvDate e={e} />
          <div>
            <div className="evtags"><EvTags e={e} /></div>
            <h1>{e.title}</h1>
            <p className="evhost">
              <EvHostIc e={e} />
              <span>
                <span>Hosted by {e.host.id ? <Link className="namebtn" href={`/members/${e.host.id}`}>{e.host.name}</Link> : <b>{e.host.name}</b>}</span>
                <small>{e.host.sub}</small>
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="evdgrid">
        <div className="evdmain">
          <section className="evbox">
            {e.recording && e.recording !== "no" && (
              <div className="polrecn">
                <Ic n="video" s={16} />
                <span><b>This event will be recorded.</b> {e.recording === "promo" ? "The recording goes to people who registered, and short clips may be used to promote future events." : "The recording goes to people who registered."} You can keep your camera off and use the chat.</span>
              </div>
            )}
            <h2>About this event</h2>
            <p style={{ whiteSpace: "pre-line" }}>{e.description}</p>
            {e.agenda.length > 0 && (
              <>
                <h3>Agenda</h3>
                <ol className="evag">{e.agenda.map((x, i) => <li key={i}>{x}</li>)}</ol>
              </>
            )}
          </section>
          {e.going > 0 && e.starts_at && (
            <section className="evbox">
              <h2>Who’s going</h2>
              <div className="evfaces">
                {faces.map((f, i) => <ZipAv key={i} name={f.name} src={f.avatar} size="s" />)}
                <span>{e.going} owner{e.going === 1 ? "" : "s"} going</span>
              </div>
            </section>
          )}
          {hostCard && hostCard.id && (
            <section className="evbox evhostbox">
              <ZipAv name={hostCard.name} src={hostCard.avatar} />
              <div><b>{hostCard.name}</b><small>{[hostCard.role, hostCard.city].filter(Boolean).join(" · ")}</small></div>
              <div className="evhb">
                {signedIn && !e.mine && <Link className="btn sm ghost" href={`/messages?with=${hostCard.id}`}>Message</Link>}
                <Link className="btn sm ghost" href={`/members/${hostCard.id}`}>View profile</Link>
              </div>
            </section>
          )}
        </div>
        <aside className="evdside">
          {zoom && !e.cancelled_at && e.mine && zoom.host && <ZoomHostCard e={e} z={zoom.host} ended={ended} />}
          {zoom && !e.cancelled_at && !e.mine && going && !ended && <ZoomTicket e={e} now={now} hasLink={!!link} />}
          {zoom && !e.cancelled_at && !e.mine && !going && !ended && <p className="small muted zmnote"><ZoomMark />On Zoom. Register and you get your own join link.</p>}
          {zoom && !e.mine && going && ended && e.host.id && <TalkBox id={e.id} first={e.host.name.split(" ")[0]} done={zoom.talked} />}
          <section className="evbox evact">
            <p className="evmeta big"><Ic n="clock" s={15} /><span>{evWhen(e, true)}</span></p>
            <p className="evmeta big">
              <Ic n={e.fmt === "online" ? "video" : "pin"} s={15} />
              <span>
                {e.fmt === "online"
                  ? zoom && e.mine
                    ? "Online. On your Zoom. Your start link is in the host card."
                    : zoom && link
                    ? <>Online on Zoom. Your personal link is in your ticket and your email.</>
                    : link
                    ? <>Online. <a href={link} target="_blank" rel="noopener">Your link to join</a> (only for you).</>
                    : "Online. The link appears here and in your reminder once you register."
                  : `${e.venue ? `${e.venue}, ` : ""}${evWhere(e)}`}
              </span>
            </p>
            <p className="evmeta big"><Ic n="ticket" s={15} /><span>{evPrice(e)}{left && e.starts_at ? ` · ${left} spots left` : ""}</span></p>
            {e.mine ? (
              <div className="evactbtns">
                {zoom?.host && !ended
                  ? <Link className="btn sm ghost wide" href={`/events/${e.slug}/green-room`}><Ic n="video" s={14} />You are hosting</Link>
                  : <span className="btn sm on wide" aria-disabled="true">You are hosting</span>}
                {zoom?.host && ended && <Link className="btn sm ghost" href={`/events/${e.slug}/wrap-up`}>Wrap-up</Link>}
                {!e.cancelled_at && (
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={async () => {
                      if (!window.confirm("Cancel this event? Everyone who saved or registered is told.")) return;
                      const r = await cancelHostedEvent(e.id).catch(() => ({ ok: false as const, error: "Could not cancel." }));
                      toast(r.ok ? "Event cancelled. Everyone registered has been told." : r.error);
                      if (r.ok) window.location.reload();
                    }}
                  >
                    Cancel event
                  </button>
                )}
              </div>
            ) : !e.cancelled_at ? (
              <div className="evactbtns"><EvGoBtn e={e} a={a} cls="wide" /><EvSaveBtn e={e} a={a} big /></div>
            ) : null}
            {cal && !e.cancelled_at && (
              <div className="evcal">
                <button type="button" className="btn sm ghost wide" aria-expanded={calOpen} onClick={() => setCalOpen(!calOpen)}><Ic n="cal" s={14} />Add to my calendar</button>
                {calOpen && (
                  <div className="evcalm" role="menu">
                    <a role="menuitem" href={cal.google} target="_blank" rel="noopener">Google Calendar</a>
                    <a role="menuitem" href={cal.outlook} target="_blank" rel="noopener">Outlook.com</a>
                    <a role="menuitem" href={`/events/${e.slug}/ics`} download={`${e.slug}.ics`} onClick={() => { setCalOpen(false); toast("Calendar file downloaded. Open it to add the event"); }}>Apple, Outlook or other (.ics file)</a>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="btn sm ghost wide"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${site}/events/${e.slug}`);
                } catch {}
                setCopied(true);
                toast("Link copied");
              }}
            >
              <Ic n="link" s={14} />{copied ? "Link copied" : "Copy link to share"}
            </button>
          </section>
          {signedIn && saved && e.starts_at && !e.cancelled_at && (
            <section className="evbox">
              <h2><Ic n="bell" s={15} />Remind me</h2>
              <p className="small muted">By email and in your notifications.{going ? "" : " Register to get the online link too."}</p>
              {([["week", "1 week before"], ["day", "1 day before"], ["hour", "1 hour before"]] as const).map(([k, l]) => (
                <button key={k} type="button" className="sxsw" role="switch" aria-checked={rem[k]} onClick={() => flip(k)}><span><b>{l}</b></span><i /></button>
              ))}
            </section>
          )}
          {signedIn && !saved && e.starts_at && !e.cancelled_at && !e.mine && (
            <p className="small muted evtip"><Ic n="bell" s={13} />Save or register and we remind you 1 day and 1 hour before.</p>
          )}
        </aside>
      </div>
      {similar.length > 0 && (
        <>
          <h2 className="evmonth">More events like this</h2>
          <div className="evlist">{similar.map((x) => <EvCard key={x.id} e={x} a={a} />)}</div>
        </>
      )}
    </div>
  );
}

function fmtLeft(ms: number) {
  if (ms <= 0) return "Now";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm} min`;
}

/** "You are the host · Your Zoom meeting is ready" (or "Link pending" with Try again). */
function ZoomHostCard({ e, z, ended }: { e: EvItem; z: NonNullable<EvZoomView["host"]>; ended: boolean }) {
  const [busy, start] = useTransition();
  const settings = [z.wr && "Waiting room", z.reg && "Registered only", z.rec && "Recording"].filter(Boolean).join(" · ") || "Standard";
  const mid = z.meetingId ? z.meetingId.replace(/^(\d{3})(\d{4})(\d+)$/, "$1 $2 $3") : "";
  return (
    <section className="evbox zmhost">
      <p className="zmeye">You are the host</p>
      {z.meetingId ? (
        <>
          <h2><ZoomMark />Your Zoom meeting is ready</h2>
          <dl className="zmkv">
            <dt>Meeting ID</dt><dd>{mid}</dd>
            <dt>Registered</dt><dd>{e.going} {e.going === 1 ? "person" : "people"}{z.reg ? ", each with their own link" : ""}</dd>
            <dt>Settings</dt><dd>{settings}</dd>
          </dl>
          {ended
            ? <Link className="btn zmblue wide" href={`/events/${e.slug}/wrap-up`}>See the wrap-up</Link>
            : <Link className="btn zmblue wide" href={`/events/${e.slug}/green-room`}>Open the green room</Link>}
          <p className="small muted" style={{ margin: 0 }}>The green room opens 15 minutes before. If you cancel the event here, we remove the Zoom meeting and email everyone.</p>
        </>
      ) : (
        <>
          <h2><ZoomMark />Link pending</h2>
          <p className="small muted" style={{ margin: 0 }}>Your event is live, but Zoom didn’t create the meeting yet. People can still register; they get their link as soon as it is ready.</p>
          <button type="button" className="btn zmblue wide" disabled={busy} onClick={() => start(async () => {
            const r = await retryEventZoom(e.id);
            toast(r.ok ? "Your Zoom meeting is ready" : r.error);
            if (r.ok) window.location.reload();
          })}>{busy ? "Trying…" : "Try again"}</button>
        </>
      )}
    </section>
  );
}

/** The attendee's ticket: a countdown, and a Join button that opens 15 minutes before the start. */
function ZoomTicket({ e, now, hasLink }: { e: EvItem; now: number; hasLink: boolean }) {
  const left = e.starts_at ? Date.parse(e.starts_at) - now : 0;
  const open = left <= 15 * 60000;
  const pct = Math.max(4, Math.min(100, 100 - Math.round((left / (7 * 86400000)) * 100)));
  return (
    <section className="zmpass">
      <div className="zmpt"><small>Your ticket · Online on Zoom</small><b>{e.title}</b><span>{evWhen(e)}</span></div>
      <div className="zmperf" aria-hidden="true" />
      <div className="zmpb">
        <div className="zmring" style={{ "--p": `${pct}%` } as React.CSSProperties} aria-hidden="true"><div><b>{fmtLeft(left)}</b><small>to start</small></div></div>
        <div>
          <b><Ic n="lock" s={13} /> {hasLink ? "Your personal link is ready" : "Your link is on its way"}</b>
          <small>{hasLink ? "It only works for you. Please don’t forward it." : "The host’s Zoom is setting it up. It will be here and in your email."}</small>
        </div>
      </div>
      {open && hasLink
        ? <a className="btn zmblue wide" href={`/events/${e.slug}/join`} target="_blank" rel="noopener"><ZoomMark />Join on Zoom</a>
        : <button type="button" className="btn wide zmdis" disabled><ZoomMark />Join opens 15 minutes before</button>}
    </section>
  );
}

/** After the event: "I'd like to talk to {host} about this". They go into the host's My leads. */
function TalkBox({ id, first, done }: { id: string; first: string; done: boolean }) {
  const [on, setOn] = useState(done);
  const [busy, start] = useTransition();
  return (
    <section className="evbox">
      <h2>After the event</h2>
      <label className="row" style={{ gap: 8, alignItems: "flex-start", cursor: on ? "default" : "pointer" }}>
        <input type="checkbox" checked={on} disabled={on || busy} onChange={() => start(async () => {
          const r = await askToTalk(id);
          if (r.ok) { setOn(true); toast(`${first} will be in touch`); } else toast(r.error);
        })} />
        <span>I’d like to talk to {first} about this<br /><small className="muted">{first} sees your name and can message you.</small></span>
      </label>
    </section>
  );
}
