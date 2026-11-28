"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { useReady } from "@/components/ready/provider";
import { MapleLeaf, MapleTag } from "@/components/maple/leaf";
import { useMaple } from "@/components/maple/provider";
import { mapleRemaining, type MapleMsg } from "@/lib/maple";
import { MAPLE_SRC_CHECKED, MAPLE_SUGGEST, type MapleAct, type MapleAnswer, type MaplePerson, type MaplePost } from "@/supabase/functions/_shared/maple-rules";

/** **bold** in Maple's answers; everything else is plain text. */
function Md({ s }: { s: string }) {
  const parts = s.split(/\*\*(.+?)\*\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : <Fragment key={i}>{p}</Fragment>))}</>;
}

const askHref = (q: string) => `/feed?compose=question&text=${encodeURIComponent(q)}`;
const fmtDate = (d: string) => {
  const x = new Date(`${d}T12:00:00`);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

function Act({ a, first }: { a: MapleAct; first: boolean }) {
  const ready = useReady();
  const m = useMaple();
  const cls = `btn sm${first ? "" : " ghost"}`;
  const [label, kind, arg] = a;
  if (kind === "nav") return <Link className={cls} href={arg}>{label}</Link>;
  if (kind === "ask") return <Link className={cls} href={askHref(arg)}>{label}</Link>;
  // the profile builder (Update 3), or the profile editor where it isn't on the page
  return ready ? (
    <button type="button" className={cls} onClick={() => { m?.closeDock(); ready.openAi(); }}>{label}</button>
  ) : (
    <Link className={cls} href="/profile/edit">{label}</Link>
  );
}

function Person({ p }: { p: MaplePerson }) {
  return (
    <div className="mlp">
      <ZipAv name={p.name} src={p.avatar} size="s" />
      <span className="stack grow" style={{ minWidth: 0, gap: 1 }}>
        <Link className="namebtn" href={`/members/${p.id}`}>{p.name}</Link>
        <small>{p.sub}</small>
      </span>
      {p.advisor && <span className="mltag adv">Advisor</span>}
      <Link className="btn sm ghost" href={`/messages?with=${p.id}`}>Message</Link>
    </div>
  );
}

function Post({ p }: { p: MaplePost }) {
  return (
    <div className="mlpost">
      <div className="row" style={{ gap: 8 }}>
        <ZipAv name={p.name} src={p.avatar} size="s" />
        <span className="stack grow" style={{ gap: 1 }}>
          <Link className="namebtn" href={`/members/${p.authorId}`}>{p.name}</Link>
          <small>{p.reply ? "Replied to a question in the feed" : p.role}</small>
        </span>
      </div>
      <p>{p.text.length > 200 ? `${p.text.slice(0, 200)}…` : p.text}</p>
    </div>
  );
}

export function MapleBubble({ x, compact }: { x: MapleMsg; compact: boolean }) {
  const m = useMaple();
  if (x.by === "me") return <div className="mlrow me"><div className="mlb me">{x.t}</div></div>;
  const A: MapleAnswer = x.a ?? { t: [x.t] };
  const fb = x.fb === 1 ? "up" : x.fb === -1 ? "dn" : "";
  return (
    <div className="mlrow">
      {!compact && <MapleLeaf size={30} />}
      <div className="mlb">
        <span className="mlwho">Maple <MapleTag /></span>
        {A.lib && <span className="mllib"><Ic n="check" s={12} />Approved by the SME Hub team{typeof A.lib === "string" ? ` · checked ${fmtDate(A.lib)}` : ""}</span>}
        {A.t.map((p, i) => <p key={i}><Md s={p} /></p>)}
        {A.limit && <Link className="btn sm" href="/membership-plans">See plans</Link>}
        {!!A.posts?.length && (
          <>
            <p className="mleye">From the community</p>
            {A.posts.map((p) => <Post key={p.id} p={p} />)}
          </>
        )}
        {!!A.people?.length && (
          <>
            <p className="mleye">{A.pro ? "SME Advisors who can help" : "People who can help"}</p>
            <div className="mlpl">{A.people.map((p) => <Person key={p.id} p={p} />)}</div>
          </>
        )}
        {!!A.acts?.length && <div className="mlacts">{A.acts.map((a, k) => <Act key={k} a={a} first={k === 0} />)}</div>}
        {!!A.chips?.length && (
          <div className="mlchips">
            {A.chips.map((c) => <button key={c} type="button" className="mlchip" onClick={() => m?.ask(c)}>{c}</button>)}
          </div>
        )}
        {!!A.src?.length && (
          <p className="mlsrc">
            <Ic n="doc" s={12} />Source:{" "}
            {A.src.map((s, i) => (
              <Fragment key={s[1]}>
                {i > 0 && " · "}
                <a href={s[1]} target="_blank" rel="noopener noreferrer">{s[0]}</a>
              </Fragment>
            ))}{" "}
            <span>(checked {A.lib && typeof A.lib === "string" ? fmtDate(A.lib) : MAPLE_SRC_CHECKED})</span>
          </p>
        )}
        {x.q && (
          <div className="mlfoot">
            <span>{A.lib ? "Answer approved by the SME Hub team. Check important details." : "AI answer. Check important details."}</span>
            <span className="mlfb">
              <button type="button" className={`mlic${fb === "up" ? " on" : ""}`} aria-pressed={fb === "up"} aria-label="Helpful" onClick={() => m?.rate(x.id, "up")}><Ic n="mlup" s={14} /></button>
              <button type="button" className={`mlic${fb === "dn" ? " on" : ""}`} aria-pressed={fb === "dn"} aria-label="Not helpful" onClick={() => m?.rate(x.id, "dn")}><Ic n="mldn" s={14} /></button>
            </span>
            <Link className="linkbtn" href={askHref(x.q)}>Ask a person instead</Link>
          </div>
        )}
      </div>
    </div>
  );
}

/** Maple's hello at the top of every chat (not saved). */
function greeting(first: string, isNew: boolean): MapleMsg {
  const t = [`Hi ${first || "there"}, I’m Maple, SME Hub’s AI assistant. I can answer business questions, find people who can help, and point you to grants, deadlines, events and jobs.`, "What are you working on?"];
  if (isNew) t.splice(1, 0, "You’re in your first week. Want help finishing your profile so the right people find you?");
  return { id: "hello", by: "maple", t: t[0], a: { t, chips: MAPLE_SUGGEST, acts: isNew ? [["Help me with my profile", "profile", ""]] : [] } };
}

export function MapleThread({ compact, id }: { compact: boolean; id: string }) {
  const m = useMaple();
  const ref = useRef<HTMLDivElement>(null);
  const list = m ? m.msgs.filter((x) => !m.since || !x.at || x.at > m.since) : [];
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [list.length, m?.busy]);
  if (!m) return null;
  return (
    <div className={compact ? "dbody mlbody" : "mlbody"} id={id} ref={ref} aria-live="polite">
      <MapleBubble x={greeting(m.first, m.isNew)} compact={compact} />
      {list.map((x) => <MapleBubble key={x.id} x={x} compact={compact} />)}
      {m.busy && (
        <div className="mlrow">
          {!compact && <MapleLeaf size={30} />}
          <div className="mlb mltyping" role="status" aria-label="Maple is writing"><i /><i /><i /></div>
        </div>
      )}
    </div>
  );
}

export function MapleComposer({ id, compact }: { id: string; compact: boolean }) {
  const m = useMaple();
  if (!m) return null;
  const rem = m.left ? mapleRemaining(m.left) : undefined;
  const send = () => m.ask(m.draft);
  return (
    <>
      <div className={`mlcomp${compact ? " sm" : ""}`}>
        <label className="sr" htmlFor={id}>Ask Maple</label>
        <textarea
          id={id}
          className="field"
          rows={compact ? 1 : 2}
          maxLength={600}
          placeholder={compact ? "Ask Maple anything" : "Ask Maple anything about your business"}
          value={m.draft}
          onChange={(e) => m.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="button" className={`btn${compact ? " sm" : ""}`} onClick={send} disabled={m.busy} aria-label="Send">
          <Ic n="send" s={14} />
          {compact ? null : "Ask"}
        </button>
      </div>
      <p className="mlleft">
        {rem === undefined ? " " : rem === null ? "Hub team: no monthly limit" : rem ? `${rem} of ${m.left!.limit} questions left this month` : "No questions left this month"}
        {rem !== undefined && rem !== null && m.plan === "free" && <> · <Link href="/membership-plans">Plus gets 100</Link></>}
      </p>
    </>
  );
}
