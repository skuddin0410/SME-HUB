"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { MAPLE_LEAF, MapleLeaf, MapleTag } from "@/components/maple/leaf";
import { useMaple } from "@/components/maple/provider";
import { MapleComposer, MapleThread } from "@/components/maple/chat";
import { mapleRemaining, type MapleLeft } from "@/lib/maple";
import { MAPLE_TRY } from "@/supabase/functions/_shared/maple-rules";

const CAN: [string, string, string, string][] = [
  ["help", "Answer business questions", "Plain-language answers with dated Canadian sources.", "How do I register for a GST/HST number?"],
  ["users", "Find people who can help", "Members, SME Advisors and businesses, with a warm introduction.", "Find a bookkeeper who can help me"],
  ["coin", "Grants and loans", "Matches from Grant Finder, with deadlines.", "Are there grants for my business?"],
  ["clock", "Deadlines", "Your GST/HST and other dates, with reminders.", "When is my next GST/HST payment due?"],
  ["calc", "Business tools", "Pricing, cash flow, loans and landed cost.", "How should I price a new service?"],
  ["cal", "Events", "Online and in-person events for owners.", "What events are coming up?"],
  ["brief", "Jobs", "Find work, or post a job of your own.", "How do I post a job?"],
  ["user", "Your profile", "Draft your introduction so the right people find you.", "Help me improve my profile"],
];
const NEVER = ["Pretend to be a person", "Post, message, connect or apply in your name", "Read your private messages, unless you share one with me", "Like or react to posts to make them look busier", "Share your details with sponsors or partners"];
const JOIN = "/auth/sign-up?next=/maple";

/** Update 46: Maple's profile page. Maple isn't a member: no followers or connections. */
export function MapleProfile({ left, history }: { left: MapleLeft | null; history: number }) {
  const m = useMaple();
  const [del, setDel] = useState(false);
  const [count, setCount] = useState(history);
  useEffect(() => setCount(history), [history]);
  if (!m) return null;
  const lim = left?.limit ?? null;
  const rem = left ? mapleRemaining(left) : null;
  return (
    <div className="cols">
      <section className="mid">
        <div className="card mlhero">
          <div className="mlcover" aria-hidden="true">
            <svg viewBox="0 0 900 180" preserveAspectRatio="xMidYMid slice">
              <g fill="#fff" opacity=".09">
                <path transform="translate(560 -20) scale(2.2) rotate(12)" d={MAPLE_LEAF} />
                <path transform="translate(760 70) scale(1.2) rotate(-18)" d={MAPLE_LEAF} />
                <path transform="translate(420 90) scale(.8) rotate(25)" d={MAPLE_LEAF} />
              </g>
            </svg>
          </div>
          <div className="mlhead">
            <MapleLeaf size={104} big />
            <div className="stack grow" style={{ gap: 4, minWidth: 0 }}>
              <h1>Maple <MapleTag lg /></h1>
              <p className="mlhl">SME Hub’s AI assistant · Built by CanadianSME</p>
              <p className="small muted">Plain-language answers · Any time of day · Points you to real people</p>
            </div>
          </div>
          <div className="mlbtns">
            {m.member ? (
              <>
                {m.settings.on ? (
                  <>
                    <button type="button" className="btn" onClick={() => m.openDock()}><Ic n="msg" s={15} />Ask Maple</button>
                    <Link className="btn ghost" href="/ask"><Ic n="expand" s={14} />Open full chat</Link>
                  </>
                ) : (
                  <button type="button" className="btn" onClick={() => void m.setSetting("on", true)}>Turn Maple on</button>
                )}
                <Link className="btn ghost" href="/settings?s=maple">Maple settings</Link>
              </>
            ) : (
              <Link className="btn" href={JOIN}>Join free to ask Maple</Link>
            )}
          </div>
        </div>
        <div className="card">
          <h2>About</h2>
          <p>Hi, I’m Maple. I help SME Hub members find answers, people and tools without hunting through menus. Ask me something the way you’d ask a friend who runs a business. I’ll give you a straight answer, show where it came from, and point you to members or SME Advisors when a person is the better help.</p>
        </div>
        <div className="card">
          <h2>What I can help with</h2>
          <div className="mlgrid">
            {CAN.map(([ic, t, d, q]) => {
              const body = (
                <>
                  <span className="mlti"><Ic n={ic} s={18} /></span>
                  <span className="stack" style={{ gap: 2 }}><b>{t}</b><small>{d}</small><em>“{q}”</em></span>
                </>
              );
              return m.member ? (
                <button key={t} type="button" className="mltile" onClick={() => m.askFrom(q)}>{body}</button>
              ) : (
                <Link key={t} className="mltile" href={JOIN}>{body}</Link>
              );
            })}
          </div>
        </div>
        <div className="card">
          <h2>How I answer</h2>
          <ul className="mlhow">
            <li><Ic n="doc" s={16} /><span><b>With sources.</b> Facts about taxes, grants and rules come with the official page and the date I checked it.</span></li>
            <li><Ic n="info" s={16} /><span><b>Honest when I’m not sure.</b> If I don’t have a solid answer, I say so instead of guessing.</span></li>
            <li><Ic n="users" s={16} /><span><b>People first.</b> I point you to members and SME Advisors who have done it before.</span></li>
            <li><Ic n="brief" s={16} /><span><b>Tax and legal: general only.</b> For decisions about your business, I suggest an accountant, lawyer or SME Advisor.</span></li>
          </ul>
        </div>
        <div className="card">
          <h2>What I never do</h2>
          <ul className="mlnever">{NEVER.map((x) => <li key={x}><Ic n="x" s={14} />{x}</li>)}</ul>
          <p className="small muted">You can turn me off or delete your history at any time in <Link href="/settings?s=maple">Settings</Link>.</p>
        </div>
      </section>
      <aside className="rail" style={{ flexBasis: 300 }}>
        {m.member && left && (
          <div className="card">
            <h2>Your questions</h2>
            {lim === null ? (
              <p className="small muted">The Hub team has no monthly limit.</p>
            ) : (
              <>
                <div className="meter"><div className="bar" role="img" aria-label={`${rem} of ${lim} left`}><i style={{ width: `${Math.round(((rem ?? 0) / Math.max(1, lim)) * 100)}%` }} /></div></div>
                <p className="small"><b>{rem} of {lim}</b> left this month</p>
                <p className="small muted">{m.plan === "free" ? "Free plan: 10 a month. Plus and Advisor: 100 a month." : "Your plan includes 100 a month."}</p>
                {m.plan === "free" && <Link className="btn sm ghost" href="/membership-plans" style={{ alignSelf: "flex-start" }}>See plans</Link>}
              </>
            )}
          </div>
        )}
        <div className="card">
          <h2>Maple at a glance</h2>
          <dl className="mldl">
            <dt>Made by</dt><dd>CanadianSME, Mississauga</dd>
            <dt>Type</dt><dd>AI assistant, not a member. No followers or connections.</dd>
            <dt>Label</dt><dd>Marked <MapleTag /> everywhere it appears</dd>
            {m.member && (
              <>
                <dt>Your history</dt>
                <dd>{count} message{count === 1 ? "" : "s"}{count > 0 && <> · <button type="button" className="linkbtn" onClick={() => setDel(true)}>Delete</button></>}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="card">
          <h2>Learn more</h2>
          <Link className="small" href="/help/meet-maple">Meet Maple (Help Centre)</Link>
          <Link className="small" href="/help/ai-limits">How AI on SME Hub uses your information</Link>
          <Link className="small" href="/policies/privacy-policy">Privacy policy</Link>
        </div>
      </aside>
      {del && <MapleDeleteDialog count={count} onClose={(done) => { setDel(false); if (done) setCount(0); }} />}
    </div>
  );
}

/** "Delete your Maple history?" with a confirm step. */
export function MapleDeleteDialog({ count, onClose }: { count: number; onClose: (done: boolean) => void }) {
  const m = useMaple();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="overlay" onClick={() => onClose(false)}>
        <div className="modal polmodal" role="dialog" aria-modal="true" aria-labelledby="mldt" onClick={(e) => e.stopPropagation()}>
          <div className="polmh">
            <h2 id="mldt">Delete your Maple history?</h2>
            <button type="button" className="iconbtn" aria-label="Close" onClick={() => onClose(false)}><Ic n="x" s={18} /></button>
          </div>
          <p className="small">This deletes all {count} messages between you and Maple. It can’t be undone. Your questions used this month stay the same.</p>
          <div className="polmf">
            <button type="button" className="btn ghost sm" onClick={() => onClose(false)}>Cancel</button>
            <button type="button" className="btn sm sxdel" disabled={busy} onClick={async () => { setBusy(true); const ok = (await m?.deleteHistory()) ?? false; setBusy(false); if (ok) onClose(true); }}>Delete history</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Update 46: the full chat at /ask (replaces "Ask the Hub AI"). */
export function MapleChatPage() {
  const m = useMaple();
  useEffect(() => {
    m?.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.load]);
  if (!m) return null;
  if (!m.member) {
    return (
      <div className="cols"><section className="mid"><div className="card mlguest">
        <MapleLeaf size={72} />
        <h1>Ask Maple <MapleTag lg /></h1>
        <p className="muted">Maple is SME Hub’s AI assistant. Ask about taxes, grants, pricing or hiring, and get a plain answer with sources, plus members who can help.</p>
        <Link className="btn" href="/auth/sign-up?next=/ask">Join free to ask Maple</Link>
        <p className="small muted">Free members get 10 questions a month.</p>
      </div></section></div>
    );
  }
  if (!m.settings.on) {
    return (
      <div className="cols"><section className="mid"><div className="card mlguest">
        <MapleLeaf size={72} />
        <h1>Maple is turned off</h1>
        <p className="muted">You turned off the AI assistant. You can turn it back on at any time.</p>
        <button type="button" className="btn" onClick={() => void m.setSetting("on", true)}>Turn Maple on</button>
      </div></section></div>
    );
  }
  const shown = m.msgs.some((x) => !m.since || !x.at || x.at > m.since);
  return (
    <div className="mlpage">
      <div className="card mlchat">
        <header className="mlph">
          <MapleLeaf size={40} />
          <span className="stack grow" style={{ gap: 1 }}><b>Maple <MapleTag /></b><small>SME Hub’s AI assistant</small></span>
          <Link className="btn sm ghost" href="/maple">Profile</Link>
          {shown && <button type="button" className="btn sm ghost" onClick={() => m.newChat()}>New chat</button>}
        </header>
        <MapleThread compact={false} id="mlpage" />
        <MapleComposer id="mlq" compact={false} />
      </div>
      <aside className="mlside">
        <div className="card">
          <h2>Try asking</h2>
          {MAPLE_TRY.map((s) => <button key={s} type="button" className="mlchip block" onClick={() => m.ask(s)}>{s}</button>)}
        </div>
        <div className="card">
          <h2>Good to know</h2>
          <ul className="mlnever small">
            <li><Ic n="doc" s={13} />Answers show their sources</li>
            <li><Ic n="users" s={13} />Tax and legal: I’ll suggest a professional</li>
            <li><Ic n="lock" s={13} />I never read your private messages</li>
          </ul>
          <Link className="small" href="/maple">More about Maple</Link>
        </div>
      </aside>
    </div>
  );
}
