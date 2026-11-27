"use client";

import { useState } from "react";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { setEventReminder, cancelHostedEvent } from "@/app/(hub)/event-actions";
import { evPrice, evWhen, evWhere, type EvHost } from "@/lib/events";
import { EvCard, EvDate, EvGoBtn, EvHostIc, EvSaveBtn, EvTags, Scene, useEvActions, type EvItem, type EvMine } from "@/components/zip/events-x";

/** Update 35: one event's page: about, agenda, who's going, the host; time, place, price, Register and Save,
 *  Add to my calendar (Google, Outlook, .ics), Copy link, and per-event reminders. */
export function EventPage({
  e, mine, signedIn, similar, faces, cal, link, site, hostCard,
}: {
  e: EvItem; mine: EvMine; signedIn: boolean; similar: EvItem[]; faces: { name: string; avatar: string | null }[];
  cal: { google: string; outlook: string } | null; link: string | null; site: string; hostCard: EvHost | null;
}) {
  const a = useEvActions(mine, signedIn);
  const [calOpen, setCalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rem, setRem] = useState(mine.rem[e.id] ?? { week: false, day: true, hour: true });
  const saved = a.saved.has(e.id) || a.going.has(e.id);
  const going = a.going.has(e.id);
  const left = e.cap ? Math.max(0, e.cap - e.going) : 0;

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
          <section className="evbox evact">
            <p className="evmeta big"><Ic n="clock" s={15} /><span>{evWhen(e, true)}</span></p>
            <p className="evmeta big">
              <Ic n={e.fmt === "online" ? "video" : "pin"} s={15} />
              <span>
                {e.fmt === "online"
                  ? link
                    ? <>Online. <a href={link} target="_blank" rel="noopener">Your link to join</a> (only for you).</>
                    : "Online. The link appears here and in your reminder once you register."
                  : `${e.venue ? `${e.venue}, ` : ""}${evWhere(e)}`}
              </span>
            </p>
            <p className="evmeta big"><Ic n="ticket" s={15} /><span>{evPrice(e)}{left && e.starts_at ? ` · ${left} spots left` : ""}</span></p>
            {e.mine ? (
              <div className="evactbtns">
                <span className="btn sm on wide" aria-disabled="true">You are hosting</span>
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
              <p className="small muted">In your notifications.{going ? "" : " Register to get the online link too."}</p>
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
