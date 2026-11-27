"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { toast } from "@/components/toast";
import { scene } from "@/lib/zip/scene";
import { cancelRegistration, registerEvent, saveEvent } from "@/app/(hub)/event-actions";
import { EV_PROV, EV_TOPICS, EV_TYPES, evDateBlock, evMonthKey, evWhen, evWhere, type Ev, type EvHost } from "@/lib/events";

/**
 * Updates 35 and 37: the Events page. Search and filters, events grouped by month (soonest first, "Dates to be
 * announced" last, past events hidden), Save with reminders, Register, a Saved tab and, for SME Advisors only, Hosting.
 */
export type EvItem = Ev & { host: EvHost; going: number; /** hosted by the signed-in member */ mine: boolean };
export type EvMine = { saved: string[]; going: string[]; rem: Record<string, { week: boolean; day: boolean; hour: boolean }> };

export function Scene({ n, h }: { n: string; h: number }) {
  return <span style={{ display: "block", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: scene(n, h) }} />;
}

export function EvDate({ e }: { e: EvItem }) {
  const b = evDateBlock(e);
  if (!b) return <div className="evdate tba" aria-hidden="true"><b>TBA</b><span>{new Date().getFullYear() + 1}</span></div>;
  return <div className="evdate" aria-hidden="true"><span>{b.mon}</span><b>{b.d}</b><span>{b.dow}</span></div>;
}
export function EvTags({ e }: { e: EvItem }) {
  return (
    <>
      <span className={`evtag ${e.fmt === "online" ? "on" : "ip"}`}><Ic n={e.fmt === "online" ? "video" : "pin"} s={12} />{e.fmt === "online" ? "Online" : "In person"}</span>
      <span className="evtag">{e.type}</span>
      {e.price === 0 ? <span className="evtag free">Free</span> : e.price ? <span className="evtag">${e.price}</span> : null}
      {e.series && <span className="evtag">{e.series}</span>}
    </>
  );
}
export function EvHostIc({ e }: { e: EvItem }) {
  if (e.host_kind !== "member")
    return (
      <span className="evhlogo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/bc-logo.png" alt="" />
      </span>
    );
  return <ZipAv name={e.host.name} src={e.host.avatar} size="s" />;
}

/** Register / Going / Full / Tell me the date, wired to the server. */
export function useEvActions(mine: EvMine, signedIn: boolean) {
  const router = useRouter();
  const [saved, setSaved] = useState(new Set(mine.saved));
  const [going, setGoing] = useState(new Set(mine.going));
  const [, start] = useTransition();
  const join = () => router.push(`/auth/sign-up?next=${encodeURIComponent(window.location.pathname)}`);

  const toggleSave = (e: EvItem) => {
    if (!signedIn) return join();
    const on = saved.has(e.id) || going.has(e.id);
    if (on && going.has(e.id)) return toast("You are registered. Cancel your registration first to remove it.");
    const next = new Set(saved);
    if (on) next.delete(e.id);
    else next.add(e.id);
    setSaved(next);
    start(async () => {
      const r = await saveEvent(e.id, !on).catch(() => ({ ok: false as const, error: "Could not save that." }));
      if (!r.ok) {
        setSaved(saved);
        return toast(r.error);
      }
      toast(on ? "Removed from saved events" : !e.starts_at ? "Saved. We’ll tell you as soon as the date is announced" : "Saved. We’ll remind you 1 day and 1 hour before");
    });
  };
  const toggleGo = (e: EvItem) => {
    if (!signedIn) return join();
    const on = going.has(e.id);
    start(async () => {
      if (on) {
        const r = await cancelRegistration(e.id).catch(() => ({ ok: false as const, error: "Could not cancel." }));
        if (!r.ok) return toast(r.error);
        const g = new Set(going);
        g.delete(e.id);
        setGoing(g);
        toast("Registration cancelled");
        return router.refresh();
      }
      const r = await registerEvent(e.id).catch(() => ({ ok: false as const, error: "Could not register." }));
      if (!r.ok) return toast(r.error);
      if (r.url) {
        window.location.href = r.url; // Stripe Checkout for a paid ticket
        return;
      }
      setGoing(new Set(going).add(e.id));
      setSaved(new Set(saved).add(e.id));
      toast("You’re going. We’ll remind you 1 day and 1 hour before");
      router.refresh();
    });
  };
  return { saved, going, toggleSave, toggleGo };
}

export function EvGoBtn({ e, a, cls }: { e: EvItem; a: ReturnType<typeof useEvActions>; cls?: string }) {
  if (!e.starts_at) {
    const on = a.saved.has(e.id);
    return (
      <button type="button" className={`btn sm ${on ? "on" : "dark"} ${cls ?? ""}`} onClick={() => a.toggleSave(e)}>
        {on ? <><Ic n="check" s={14} />We’ll tell you</> : <><Ic n="bell" s={14} />Tell me the date</>}
      </button>
    );
  }
  const on = a.going.has(e.id);
  if (!on && e.cap && e.going >= e.cap) return <button type="button" className={`btn sm ghost ${cls ?? ""}`} disabled>Full</button>;
  return (
    <button type="button" className={`btn sm ${on ? "on" : "dark"} ${cls ?? ""}`} aria-pressed={on} onClick={() => a.toggleGo(e)}>
      {on ? <><Ic n="check" s={14} />Going</> : e.price ? `Register · $${e.price}` : "Register"}
    </button>
  );
}
export function EvSaveBtn({ e, a, big }: { e: EvItem; a: ReturnType<typeof useEvActions>; big?: boolean }) {
  const on = a.saved.has(e.id) || a.going.has(e.id);
  return (
    <button type="button" className={`evsave${on ? " on" : ""}${big ? " big" : ""}`} aria-pressed={on} onClick={() => a.toggleSave(e)} aria-label={on ? "Saved. Remove from saved events" : "Save this event and get reminders"}>
      <span style={{ display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: `<svg width="16" height="16" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>` }} />
      {big && <span>{on ? "Saved" : "Save"}</span>}
    </button>
  );
}

export function EvCard({ e, a, extra }: { e: EvItem; a: ReturnType<typeof useEvActions>; extra?: React.ReactNode }) {
  return (
    <article className="evcard" aria-labelledby={`evt-${e.id}`}>
      <EvDate e={e} />
      <Link className="evthumb" href={`/events/${e.slug}`} tabIndex={-1} aria-hidden="true"><Scene n={e.img} h={120} /></Link>
      <div className="evbody">
        <div className="evtags"><EvTags e={e} /></div>
        <h3 id={`evt-${e.id}`}><Link href={`/events/${e.slug}`}>{e.title}</Link></h3>
        <p className="evmeta"><Ic n="clock" s={13} />{evWhen(e)}</p>
        <p className="evmeta"><Ic n={e.fmt === "online" ? "video" : "pin"} s={13} />{evWhere(e)}</p>
        <p className="evhost">
          <EvHostIc e={e} />
          <span>
            {e.host.id ? <Link className="namebtn" href={`/members/${e.host.id}`}>{e.host.name}</Link> : e.host.name}
            <small>{e.host.sub}{e.going ? ` · ${e.going} going` : ""}</small>
          </span>
        </p>
      </div>
      <div className="evacts">{extra}<EvGoBtn e={e} a={a} /><EvSaveBtn e={e} a={a} /></div>
    </article>
  );
}

type Filters = { q: string; when: "any" | "week" | "month" | "q3"; fmt: "any" | "online" | "inperson"; type: string; topic: string; prov: string; free: boolean; host: "any" | "csme" | "members" };
const NONE: Filters = { q: "", when: "any", fmt: "any", type: "", topic: "", prov: "", free: false, host: "any" };

function Seg<T extends string>({ opts, cur, label, onPick }: { opts: [T, string][]; cur: T; label: string; onPick: (v: T) => void }) {
  return (
    <div className="evseg" role="radiogroup" aria-label={label}>
      {opts.map(([v, t]) => (
        <button key={v} type="button" role="radio" aria-checked={cur === v} onClick={() => onPick(v)}>{t}</button>
      ))}
    </div>
  );
}
function Sel({ label, value, opts, onPick }: { label: string; value: string; opts: [string, string][]; onPick: (v: string) => void }) {
  return (
    <label className="evsel">
      <span className="sr">{label}</span>
      <select aria-label={label} value={value} onChange={(e) => onPick(e.target.value)}>
        <option value="">{label}</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function EventsX({ events, mine, signedIn, canHost, initialTab, now }: { events: EvItem[]; mine: EvMine; signedIn: boolean; canHost: boolean; initialTab: string; now: number }) {
  const [f, setF] = useState<Filters>(NONE);
  const [tab, setTab] = useState<"all" | "saved" | "hosting">(initialTab === "saved" ? "saved" : initialTab === "hosting" && canHost ? "hosting" : "all");
  const a = useEvActions(mine, signedIn);
  const active = (f.q.trim() ? 1 : 0) + (f.when !== "any" ? 1 : 0) + (f.fmt !== "any" ? 1 : 0) + (f.type ? 1 : 0) + (f.topic ? 1 : 0) + (f.prov ? 1 : 0) + (f.free ? 1 : 0) + (f.host !== "any" ? 1 : 0);
  const sort = (l: EvItem[]) => l.slice().sort((x, y) => (!x.starts_at ? 1 : !y.starts_at ? -1 : Date.parse(x.starts_at) - Date.parse(y.starts_at)));

  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return events.filter((e) => {
      if (e.flagship && !active) return false; // shown in the banner instead
      const t = e.starts_at ? Date.parse(e.starts_at) : null;
      if (q && !`${e.title} ${e.description} ${e.host.name} ${e.city} ${e.type} ${e.topic}`.toLowerCase().includes(q)) return false;
      if (f.when !== "any") {
        if (t === null) return false;
        if ((t - now) / 864e5 > { week: 7, month: 31, q3: 92 }[f.when]) return false;
      }
      if (f.fmt !== "any" && e.fmt !== f.fmt) return false;
      if (f.type && e.type !== f.type) return false;
      if (f.topic && e.topic !== f.topic) return false;
      if (f.prov && (e.fmt !== "inperson" || e.prov !== f.prov)) return false;
      if (f.free && e.price !== 0) return false;
      if (f.host === "csme" && e.host_kind === "member") return false;
      if (f.host === "members" && e.host_kind !== "member") return false;
      return true;
    });
  }, [events, f, active, now]);

  const savedList = sort(events.filter((e) => a.saved.has(e.id) || a.going.has(e.id)));
  const myHosted = sort(events.filter((e) => e.mine));
  const feature = events.find((e) => e.flagship);
  const remLine = (e: EvItem) => {
    const r = mine.rem[e.id] ?? { week: false, day: true, hour: true };
    const x = [r.week && "1 week", r.day && "1 day", r.hour && "1 hour"].filter(Boolean);
    return x.length ? `Reminders ${x.join(", ")} before` : "No reminders";
  };

  const grouped: [string, EvItem[]][] = [];
  for (const e of sort(list)) {
    const k = evMonthKey(e);
    const g = grouped.find((x) => x[0] === k);
    if (g) g[1].push(e);
    else grouped.push([k, [e]]);
  }

  return (
    <div className="evpage">
      <div className="evhead">
        <div>
          <h1>Events</h1>
          <p className="muted">Webinars, workshops and meetups for Canadian small business owners, from CanadianSME and from members.</p>
        </div>
        <div className="evhbtn">{canHost && <Link className="btn dark" href="/events/host"><Ic n="plus" s={15} />Host an event</Link>}</div>
      </div>
      <div className="evtabs" role="tablist">
        {([["all", "All events", ""], ["saved", "Saved", savedList.length ? String(savedList.length) : ""], ...(canHost ? [["hosting", "Hosting", myHosted.length ? String(myHosted.length) : ""]] : [])] as [typeof tab, string, string][]).map(([k, l, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}{n && <> <em>{n}</em></>}</button>
        ))}
      </div>

      {tab === "saved" ? (
        !signedIn ? (
          <div className="evempty"><b>Join free to save events</b><Link className="btn sm dark" href="/auth/sign-up?next=/events">Join free</Link></div>
        ) : savedList.length ? (
          <>
            <p className="small muted evhint"><Ic n="bell" s={14} />We remind you in your notifications. Change the timing on each event’s page, or turn event reminders off in <Link href="/settings?s=notif">Settings</Link>.</p>
            <div className="evlist">
              {savedList.map((e) => (
                <EvCard key={e.id} e={e} a={a} extra={<span className="evrem"><Ic n="bell" s={12} />{e.starts_at ? remLine(e) : "We’ll tell you the date"}</span>} />
              ))}
            </div>
          </>
        ) : (
          <div className="evempty">
            <Ic n="mark" s={28} />
            <b>No saved events yet</b>
            <span>Select the bookmark on any event. We remind you 1 day and 1 hour before, in your notifications.</span>
            <button type="button" className="btn sm ghost" onClick={() => setTab("all")}>Browse events</button>
          </div>
        )
      ) : tab === "hosting" ? (
        <>
          <div className="evhosthead"><p className="muted">Events you host show here and on Hub Events.</p><Link className="btn sm dark" href="/events/host"><Ic n="plus" s={14} />Host an event</Link></div>
          {myHosted.length ? (
            <div className="evlist">{myHosted.map((e) => <EvCard key={e.id} e={e} a={a} />)}</div>
          ) : (
            <div className="evempty"><Ic n="cal" s={28} /><b>You are not hosting any events yet</b><span>Webinars, workshops and meetups for other owners. Free or paid.</span></div>
          )}
        </>
      ) : (
        <>
          <div className="evfilters" role="search" aria-label="Find events">
            <div className="evrow1">
              <label className="evsearch">
                <Ic n="search" s={16} />
                <span className="sr">Search events</span>
                <input type="search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search by topic, host or city" />
              </label>
              <Seg opts={[["any", "Any date"], ["week", "This week"], ["month", "This month"], ["q3", "Next 3 months"]]} cur={f.when} label="When" onPick={(v) => setF({ ...f, when: v })} />
            </div>
            <div className="evrow2">
              <Seg opts={[["any", "All"], ["online", "Online"], ["inperson", "In person"]]} cur={f.fmt} label="Format" onPick={(v) => setF({ ...f, fmt: v })} />
              <Sel label="Any type" value={f.type} opts={EV_TYPES.map((t) => [t, t])} onPick={(v) => setF({ ...f, type: v })} />
              <Sel label="Any topic" value={f.topic} opts={EV_TOPICS.map((t) => [t, t])} onPick={(v) => setF({ ...f, topic: v })} />
              <Sel label="Any province" value={f.prov} opts={Object.entries(EV_PROV)} onPick={(v) => setF({ ...f, prov: v })} />
              <Sel label="Any host" value={f.host === "any" ? "" : f.host} opts={[["csme", "CanadianSME and SME Hub"], ["members", "Hosted by SME Advisors"]]} onPick={(v) => setF({ ...f, host: (v || "any") as Filters["host"] })} />
              <button type="button" className={`evchip${f.free ? " on" : ""}`} aria-pressed={f.free} onClick={() => setF({ ...f, free: !f.free })}>Free only</button>
              {active > 0 && <button type="button" className="linkbtn evclear" onClick={() => setF(NONE)}>Clear filters ({active})</button>}
            </div>
          </div>
          {!active && feature && (
            <div className="evfeat">
              <div className="evfart" aria-hidden="true"><Scene n="awning" h={160} /></div>
              <div className="evftxt">
                <span className="evfeye">From CanadianSME</span>
                <h2>{feature.title}</h2>
                <p>Talks, exhibitors and a day of networking. Members get early access and a discount. {feature.starts_at ? evWhen(feature, true) : "Date to be announced."}</p>
                <div className="evfbtn"><EvGoBtn e={feature} a={a} /><Link className="btn sm ghost" href={`/events/${feature.slug}`}>About the show</Link></div>
              </div>
            </div>
          )}
          <p className="evcount" aria-live="polite">{list.length} upcoming event{list.length === 1 ? "" : "s"}</p>
          {list.length ? (
            grouped.map(([k, l]) => (
              <section key={k}>
                <h2 className="evmonth">{k}</h2>
                <div className="evlist">{l.map((e) => <EvCard key={e.id} e={e} a={a} />)}</div>
              </section>
            ))
          ) : (
            <div className="evempty">
              <Ic n="cal" s={28} />
              <b>No events match these filters</b>
              <span>Try a wider date range or clear the filters.</span>
              {active > 0 && <button type="button" className="btn sm ghost" onClick={() => setF(NONE)}>Clear filters</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
