"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { replyToThread, voteReply } from "@/app/(hub)/thread-actions";
import { ZipAv } from "@/components/zip/bits";
import { Ic } from "@/components/zip/ic";
import { LinkedText } from "@/components/zip/short-link";
import { toast } from "@/components/toast";
import { safetyPlain, showSafety } from "@/lib/safety/client";
import type { Reply } from "@/lib/threads";

/** Update 42: the reply box, sorting, Helpful votes and Advisor/host answers on a thread page. */

type Props = {
  threadId: string;
  kind: "mon" | "wed" | "fri" | "group";
  replies: Reply[];
  me: { id: string; full_name: string | null; avatar_url: string | null } | null;
  open: boolean;
  /** the viewer posted this week's Friday promotion */
  promoted: boolean;
  /** the viewer may answer under replies (an Advisor on Wednesday, the host in a check-in, the team) */
  canAnswer: boolean;
  nextDay: string;
};

const PLACEHOLDER = { fri: "What you do, who you help, and this week’s offer", wed: "Your question for the Advisors", mon: "Write your reply", group: "Write your reply" };

function Who({ r }: { r: Reply }) {
  const a = r.author;
  return (
    <div className="ccrh">
      <ZipAv name={a?.full_name || "Member"} src={a?.avatar_url} size="s" />
      <span>
        {a ? <Link href={`/members/${a.id}`} className="namebtn"><b>{a.full_name}</b></Link> : <b>A member</b>}
        {r.is_host && <em className="cchost">Host</em>}
        {r.is_advisor && <em className="ccad">SME Advisor</em>}
        <small>{a?.headline ?? ""}</small>
      </span>
    </div>
  );
}

export function ThreadView({ threadId, kind, replies, me, open, promoted, canAnswer, nextDay }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<"top" | "new">("top");
  const [draft, setDraft] = useState("");
  const [answering, setAnswering] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [votes, setVotes] = useState<Record<string, { on: boolean; n: number }>>({});
  const [busy, start] = useTransition();
  const [done, setDone] = useState(promoted);

  const list = useMemo(() => {
    const l = [...replies];
    if (sort === "top") l.sort((a, b) => (votes[b.id]?.n ?? b.helpful) - (votes[a.id]?.n ?? a.helpful) || b.created_at.localeCompare(a.created_at));
    else l.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return l;
  }, [replies, sort, votes]);
  const total = replies.reduce((n, r) => n + 1 + r.answers.length, 0);

  const send = (text: string, parent: string | null, after: () => void) =>
    start(async () => {
      const r = await replyToThread(threadId, text, parent).catch(() => ({ error: "Your reply didn’t post. Try again." }) as { error: string });
      if ("error" in r && r.error) {
        if (!showSafety(r.error)) toast(safetyPlain(r.error) ?? r.error);
        return;
      }
      after();
      if ("held" in r && r.held) return toast("Thanks. Your reply is being checked by the Hub team and will appear once it’s approved.");
      if (kind === "fri" && !parent) {
        setDone(true);
        toast("Posted. Members see it in this week’s Friday thread.");
      } else toast(parent ? "Answer posted" : "Reply posted");
      router.refresh();
    });

  const vote = (r: Reply) => {
    if (!me) return router.push("/auth/sign-up");
    const cur = votes[r.id] ?? { on: r.voted, n: r.helpful };
    const next = { on: !cur.on, n: cur.n + (cur.on ? -1 : 1) };
    setVotes((v) => ({ ...v, [r.id]: next }));
    voteReply(r.id, next.on)
      .then((x) => {
        if (x.error) { setVotes((v) => ({ ...v, [r.id]: cur })); toast(x.error); }
        else if (typeof x.n === "number") setVotes((v) => ({ ...v, [r.id]: { on: next.on, n: x.n! } }));
      })
      .catch(() => { setVotes((v) => ({ ...v, [r.id]: cur })); toast("That didn’t save. Try again."); });
  };

  return (
    <>
      {!me ? (
        <div className="ccjoin"><span>Join free to add yours.</span><Link className="btn sm dark" href="/auth/sign-up">Join free</Link></div>
      ) : !open ? (
        <div className="ccjoin"><Ic n="clock" s={15} /><span>This thread is archived. A new one opens on {nextDay}.</span></div>
      ) : kind === "fri" && done ? (
        <div className="ccdone"><Ic n="check" s={15} /><span>You’ve posted your promotion for this week. Next one opens on Friday.</span></div>
      ) : (
        <form className="cccomp" onSubmit={(e) => { e.preventDefault(); if (!draft.trim()) return toast("Write your reply first"); send(draft, null, () => setDraft("")); }}>
          <span className="ccme"><ZipAv name={me.full_name || "Me"} src={me.avatar_url} size="s" /></span>
          <label className="sr" htmlFor="ccdraft">Your reply</label>
          <textarea id="ccdraft" rows={2} maxLength={2000} placeholder={PLACEHOLDER[kind]} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="btn sm dark" disabled={busy}>Post</button>
        </form>
      )}

      <div className="ccbar">
        <b>{total} {total === 1 ? "reply" : "replies"}</b>
        <span className="ccseg" role="radiogroup" aria-label="Sort">
          {([["top", "Most helpful"], ["new", "Newest"]] as const).map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={sort === k} onClick={() => setSort(k)}>{l}</button>
          ))}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="ccjoin"><span>No replies yet. Be the first.</span></div>
      ) : (
        <ol className="ccreplies">
          {list.map((r) => {
            const v = votes[r.id] ?? { on: r.voted, n: r.helpful };
            return (
              <li key={r.id} className={`ccr${r.is_host ? " host" : ""}`}>
                <Who r={r} />
                <p><LinkedText text={r.body} /></p>
                {r.answers.map((a) => (
                  <div key={a.id} className="ccans">
                    <ZipAv name={a.author?.full_name || "Member"} src={a.author?.avatar_url} size="s" />
                    <div>
                      <b>{a.author?.full_name ?? "A member"}</b>
                      {a.is_advisor ? <em className="ccad">SME Advisor</em> : a.is_host ? <em className="cchost">Host</em> : null}
                      <p><LinkedText text={a.body} /></p>
                      {a.is_advisor && a.author && <Link href={`/members/${a.author.id}`} className="cclink">Book a free consultation</Link>}
                    </div>
                  </div>
                ))}
                <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="cchelp" aria-pressed={v.on} onClick={() => vote(r)}><Ic n="up" s={13} />Helpful · {v.n}</button>
                  {canAnswer && open && answering !== r.id && (
                    <button type="button" className="cchelp" onClick={() => { setAnswering(r.id); setAnswer(""); }}>Answer</button>
                  )}
                </span>
                {answering === r.id && (
                  <form className="cccomp" onSubmit={(e) => { e.preventDefault(); if (!answer.trim()) return; send(answer, r.id, () => { setAnswering(null); setAnswer(""); }); }}>
                    <label className="sr" htmlFor={`ans-${r.id}`}>Your answer</label>
                    <textarea id={`ans-${r.id}`} rows={2} maxLength={2000} placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
                    <button type="submit" className="btn sm dark" disabled={busy}>Post</button>
                    <button type="button" className="btn sm ghost" onClick={() => setAnswering(null)}>Cancel</button>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
