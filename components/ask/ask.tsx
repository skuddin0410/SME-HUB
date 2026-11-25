"use client";

import { useState } from "react";
import Link from "next/link";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { toast } from "@/components/toast";
import { askHub } from "@/app/(hub)/ask-actions";
import { ASK_SUGGESTIONS, type Ask } from "@/lib/ask";

/** Ask the Hub (handoff: ask): the question box with this month's allowance, suggestions, and the answers. */
export function AskHub({ initial, left: left0, aiOn }: { initial: Ask[]; left: { used: number; limit: number | null }; aiOn: boolean }) {
  const [q, setQ] = useState("");
  const [asks, setAsks] = useState(initial);
  const [left, setLeft] = useState(left0);
  const [busy, setBusy] = useState(false);
  const remaining = left.limit == null ? null : Math.max(0, left.limit - left.used);
  const out = remaining === 0;
  const go = async (text: string) => {
    const t = text.trim();
    if (!t) return toast("Type a question first");
    if (out) return toast("No free questions left this month");
    setBusy(true);
    const r = await askHub(t);
    setBusy(false);
    if (r.error || !r.ask) return toast(r.error ?? "That didn’t work. Try again.");
    setAsks((a) => [r.ask!, ...a]);
    if (r.left) setLeft(r.left);
    setQ("");
  };
  return (
    <>
      <div className="card">
        <label className="sr" htmlFor="aq">Your question</label>
        <textarea className="field" id="aq" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} placeholder="Ask a business question, such as: how do I price a new service?" />
        <div className="row" style={{ flexWrap: "wrap" }}>
          {remaining != null ? (
            <div className="meter grow">
              <div className="bar" role="img" aria-label={`${remaining} of ${left.limit} questions left`}><i style={{ width: `${(remaining / Math.max(1, left.limit!)) * 100}%` }} /></div>
              {remaining} of {left.limit} {left.limit === 10 ? "free " : ""}questions left this month
            </div>
          ) : <span className="grow muted small">No monthly limit for the Hub team.</span>}
          <button type="button" className="btn" disabled={busy} onClick={() => go(q)}><Ic n="spark" />{busy ? "Asking…" : "Ask"}</button>
        </div>
        <div className="chips">{ASK_SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" aria-pressed="false" disabled={busy} onClick={() => go(s)}>{s}</button>)}</div>
      </div>
      {out && (
        <div className="card">
          <strong>You have used your {left.limit} {left.limit === 10 ? "free " : ""}questions this month.</strong>
          <p className="muted">Plus members get 100 questions a month.</p>
          <Link className="btn" href="/membership-plans" style={{ alignSelf: "flex-start" }}>See plans</Link>
        </div>
      )}
      {asks.map((a) => {
        const s = a.sources;
        const found = s.posts.length || s.members.length || s.biz.length;
        return (
          <div key={a.id} className="card">
            <p className="eyebrow">You asked</p>
            <h2 style={{ fontSize: 17, lineHeight: 1.35 }}>{a.q}</h2>
            {a.answer && <div className="stack" style={{ gap: 6 }}>{a.answer.split(/\n{2,}/).map((p, i) => <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>)}</div>}
            {!found && !a.answer && <p>No member has covered this yet. Post it to the community and it will be sent to members who can help.</p>}
            {s.posts.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 4 }}>What members have said</p>
                {s.posts.map((p) => (
                  <div key={p.id} className="ans">
                    <div className="row"><ZipAv name={p.author.name} src={p.author.avatar} size="s" /><div className="stack grow"><Link className="namebtn" href={`/members/${p.author.id}`}>{p.author.name}</Link><span className="muted small">{p.about || p.author.role}</span></div></div>
                    <p>{p.text}</p>
                    <Link className="small" href={`/posts/${p.id}`} style={{ color: "var(--link)", fontWeight: 600 }}>Read the post</Link>
                  </div>
                ))}
              </>
            )}
            {s.members.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 4 }}>Members who can help</p>
                <div className="list">
                  {s.members.map((m) => (
                    <div key={m.id} className="row"><ZipAv name={m.name} src={m.avatar} size="s" /><div className="stack grow"><Link className="namebtn" href={`/members/${m.id}`}>{m.name}</Link><span className="muted small">{m.helps}</span></div><Link className="btn sm ghost" href={`/messages?with=${m.id}`}>Message</Link></div>
                  ))}
                </div>
              </>
            )}
            {s.biz.length > 0 && (
              <>
                <p className="eyebrow" style={{ marginTop: 4 }}>Member businesses</p>
                <p>{s.biz.map((b, i) => <span key={b.slug}>{i ? " · " : ""}<Link href={`/businesses/${b.slug}`}><strong>{b.name}</strong></Link>{b.city ? ` (${b.city})` : ""}</span>)}</p>
              </>
            )}
            <div className="row" style={{ flexWrap: "wrap" }}>
              <Link className="btn" href={`/feed?compose=question&text=${encodeURIComponent(a.q)}`}>Ask the community</Link>
              <span className="muted small">Tax and legal questions are sent to an SMB Advisor.</span>
            </div>
            <p className="muted small" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              {aiOn ? "Written by AI from member posts, members and businesses on the Hub. Check important details before you act." : "Put together from member posts, members and businesses on the Hub."}
            </p>
          </div>
        );
      })}
    </>
  );
}
