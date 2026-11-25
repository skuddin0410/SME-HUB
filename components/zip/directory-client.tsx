"use client";
import { AnimatedList } from "@/components/zip/animated-list";

import { displayName } from "@/lib/zip/profile-rules";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { requestConnection, removeConnection } from "@/app/(hub)/actions";
import { toggleFollow } from "@/app/(hub)/network-actions";
import type { LinkState } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { useReady } from "@/components/ready/provider";
import { ZipAv } from "@/components/zip/bits";
import { TYPES } from "@/lib/zip/types";
import { LAND, MAP_LABELS, NFLD, outline, placeOf, placePins } from "@/lib/zip/geo";

export type DirMember = {
  id: string;
  name: string;
  headline: string;
  city: string;
  avatar: string | null;
  type: string;
  recs: number;
  active: string;
  today: boolean;
  helps: string[];
  needs: string[];
};

function TypeTag({ type }: { type: string }) {
  const t = TYPES[type] ?? TYPES.owner;
  return <span className="tag ptype" style={{ background: t[1], color: t[2] }}>{t[0]}</span>;
}

/** Selecting a card or a pin shows that member in the panel under the map, like the guide. */
export function DirectoryBody({ members: all, signedIn, links, following, form, invite, rules }: {
  members: DirMember[]; signedIn: boolean; links: Record<string, LinkState>; following: string[]; form: React.ReactNode; invite: boolean;
  /** what the team chose on Profile settings: layout, card fields, name style, invite button */
  rules?: { dview: string; dswitch: boolean; dcard: Record<string, boolean>; dname: string; invites: boolean };
}) {
  const card = { online: true, type: true, last: true, ...rules?.dcard };
  const members = all.map((m) => ({ ...m, name: displayName(m.name, rules?.dname ?? "full") }));
  const [view, setView] = useState<"grid" | "list">(rules?.dview === "list" ? "list" : "grid");
  const [selId, setSelId] = useState<string | null>(null);
  const sel = members.find((m) => m.id === selId) ?? members[0] ?? null;
  const pins = placePins(members.flatMap((m) => { const at = placeOf(m.city); return at ? [{ id: m.id, at }] : []; }));

  return (
    <div className="dirwrap">
      <section className="stack" style={{ gap: 14 }}>
        {form}
        <div className="row" style={{ flexWrap: "wrap" }}>
          <h2 className="grow" style={{ font: "800 20px var(--display)" }}>Members · {members.length}</h2>
          {rules?.dswitch !== false && <span className="vsw" role="group" aria-label="Layout">
            <button type="button" aria-pressed={view === "grid"} aria-label="Grid" onClick={() => setView("grid")}><Ic n="grid" s={16} /></button>
            <button type="button" aria-pressed={view === "list"} aria-label="List" onClick={() => setView("list")}><Ic n="filter" s={16} /></button>
          </span>}
          <SortSelect />
          {invite && rules?.invites !== false && <Link href="/network/connections" className="btn sm"><Ic n="users" s={15} />Invite</Link>}
        </div>
        {members.length === 0 ? (
          <div className="card">
            <strong>No members match.</strong>
            <p className="muted">Try a different word or reset the search.</p>
            <Link href="/network" className="btn sm ghost" style={{ alignSelf: "flex-start" }}>Reset</Link>
          </div>
        ) : (
          <AnimatedList className={view === "list" ? "dirlist" : "dirgrid"}>
            {members.map((m) => {
              const pressed = sel?.id === m.id;
              const meta = (
                <>
                  {m.recs > 0 && <span className="recby"><Ic n="spark" s={13} />Recommended by {m.recs}</span>}
                  {card.last && m.active && <span className="muted small">{m.active}</span>}
                </>
              );
              const av = <span className="avwrap"><ZipAv name={m.name} src={m.avatar} size="l" />{card.online && m.today && <i className="ondot sm" />}</span>;
              return view === "list" ? (
                <button key={m.id} type="button" className="dircard dirrow" aria-pressed={pressed} onClick={() => setSelId(m.id)}>
                  {av}
                  <span className="stack grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="nm">{m.name}</span>{card.type && <TypeTag type={m.type} />}</span>
                    <span>{m.headline}</span>
                    {m.recs > 0 && <span className="recby"><Ic n="spark" s={13} />Recommended by {m.recs}</span>}
                    <span className="muted small">{m.city}{card.last && m.active ? ` · ${m.active}` : ""}</span>
                  </span>
                </button>
              ) : (
                <button key={m.id} type="button" className="dircard" aria-pressed={pressed} onClick={() => setSelId(m.id)}>
                  <span className="row">
                    {av}
                    <span className="stack grow" style={{ minWidth: 0, gap: 3 }}>
                      <span className="nm">{m.name}</span>
                      {card.type && <span><TypeTag type={m.type} /></span>}
                      <span className="muted small">{m.city}</span>
                    </span>
                  </span>
                  <span>{m.headline}</span>
                  {meta}
                </button>
              );
            })}
          </AnimatedList>
        )}
      </section>

      <aside className="dirmap" aria-label="Member map">
        <div className="mapbox">
          <svg className="land" viewBox="0 0 700 300" aria-hidden="true">
            <path d={outline(LAND) + outline(NFLD)} className="landfill" strokeWidth={1} strokeLinejoin="round" />
            {MAP_LABELS.map(([t, lng, lat]) => {
              const c = [Math.round((lng + 141) * 7.8 * 10) / 10 + 4, Math.round((66 - lat) * 12.2 * 10) / 10];
              return <text key={t} x={c[0]} y={c[1]} fontSize={9} fontWeight={600} textAnchor="middle" fill="var(--maplab)">{t}</text>;
            })}
          </svg>
          {members.map((m) => {
            const at = pins.get(m.id);
            if (!at) return null;
            return (
              <button key={m.id} type="button" className="pin" aria-pressed={sel?.id === m.id} aria-label={`${m.name}, ${m.city}`} onClick={() => setSelId(m.id)} style={{ left: `${at.left}%`, top: `${at.top}%` }}>
                <ZipAv name={m.name} src={m.avatar} size="s" />
              </button>
            );
          })}
          <span className="maphint">Simplified map of Canada</span>
        </div>
        {sel ? <Pop m={sel} signedIn={signedIn} link={links[sel.id] ?? "none"} following={following.includes(sel.id)} key={sel.id} /> : <div className="pop"><span className="muted small">Choose a member from the list or the map.</span></div>}
      </aside>
    </div>
  );
}

function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <>
      <label htmlFor="psort" className="small" style={{ fontWeight: 600 }}>Sort by</label>
      <select id="psort" className="field" style={{ width: "auto", borderRadius: 999 }} value={sp.get("sort") === "name" ? "name" : "active"}
        onChange={(e) => { const next = new URLSearchParams(sp.toString()); next.set("sort", e.target.value); router.push(`?${next.toString()}`); }}>
        <option value="active">Recently active</option>
        <option value="name">Name, A to Z</option>
      </select>
    </>
  );
}

function Pop({ m, signedIn, link, following }: { m: DirMember; signedIn: boolean; link: LinkState; following: boolean }) {
  const router = useRouter();
  const ready = useReady();
  const [state, setState] = useState<LinkState>(link);
  const [follows, setFollows] = useState(following);
  const [, start] = useTransition();
  const gate = (fn: () => void) => (signedIn ? fn() : router.push("/auth/sign-up"));
  return (
    <div className="pop">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <ZipAv name={m.name} src={m.avatar} size="l" />
        <div className="stack grow">
          <Link href={`/members/${m.id}`} className="namebtn">{m.name}</Link>
          <span className="muted small">{m.today && <span className="actdot" />}{m.active ? `${m.active} · ` : ""}{m.city}</span>
          <span className="small">{m.headline}</span>
        </div>
        <TypeTag type={m.type} />
      </div>
      {m.helps.length > 0 && <div className="small"><strong>Can help with:</strong> {m.helps.join(", ")}</div>}
      {m.needs.length > 0 && <div className="small"><strong>Looking for:</strong> {m.needs.join(", ")}</div>}
      <div className="row" style={{ flexWrap: "wrap" }}>
        <Link href={signedIn ? `/messages?with=${m.id}` : "/auth/sign-up"} className="btn sm"><Ic n="msg" s={14} />Send message</Link>
        {state === "connected" ? (
          <span className="btn sm ghost" aria-disabled="true">Connected</span>
        ) : (
          <button type="button" className="btn sm ghost" onClick={() => gate(() => {
            const run = () => {
              const before = state;
              const next: LinkState = state === "sent" ? "none" : "sent";
              setState(next);
              start(async () => { try { await (before === "sent" ? removeConnection(m.id) : requestConnection(m.id)); } catch { setState(before); } });
            };
            if (ready && state !== "sent") ready.gate("connect", run); else run();
          })}>
            <Ic n="users" s={14} />{state === "sent" ? "Pending" : state === "received" ? "Respond" : "Connect"}
          </button>
        )}
        <button type="button" className="btn sm ghost" aria-pressed={follows} onClick={() => gate(() => {
          const before = follows;
          setFollows(!before);
          start(async () => { try { await toggleFollow(m.id, before); } catch { setFollows(before); } });
        })}>
          <Ic n="flag" s={14} />{follows ? "Following" : "Follow"}
        </button>
        <Link href={`/members/${m.id}`} className="btn sm ghost">View profile</Link>
      </div>
    </div>
  );
}
