"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";
import { inviteToGroup, removeGroupInvite } from "@/app/(hub)/actions";
import { deleteReview, removeReviewReply, replyToReview, saveReview, toggleFollow } from "@/app/(hub)/business-actions";
import type { Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-foreground/25"} />
      ))}
    </span>
  );
}

export type Review = {
  author: Author;
  rating: number;
  body: string;
  created_at: string;
  criteria: Record<string, number>;
  status: string;
  reply: string | null;
};

/** Reviews rate each criterion from 1 to 5; the overall score is their average. Owners can reply once per review. */
export function Reviews({
  companyId,
  criteria,
  initial,
  me,
  canReview,
  canReply,
  isStaff,
}: {
  companyId: string;
  criteria: string[];
  initial: Review[];
  me: Author | null;
  canReview: boolean;
  canReply: boolean;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initial);
  const mine = me ? reviews.find((r) => r.author.id === me.id) : undefined;
  const [scores, setScores] = useState<Record<string, number>>(mine?.criteria ?? {});
  const [body, setBody] = useState(mine?.body ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const shown = reviews.filter((r) => r.status === "published" || r.author.id === me?.id);
  const average = shown.length ? shown.reduce((n, r) => n + r.rating, 0) / shown.length : 0;

  const submit = () => {
    if (!me) return router.push("/auth/login");
    const values = Object.values(scores);
    if (!values.length) return setError("Rate at least one thing first.");
    const before = reviews;
    const rating = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    setError(null);
    setSaved(true);
    setReviews([{ author: me, rating, body: body.trim(), created_at: new Date().toISOString(), criteria: scores, status: mine?.status ?? "published", reply: mine?.reply ?? null }, ...reviews.filter((r) => r.author.id !== me.id)]);
    saveReview(companyId, scores, body)
      .then(() => router.refresh())
      .catch((e: Error) => {
        setReviews(before);
        setSaved(false);
        setError(e.message || "Could not save your review. Try again.");
      });
  };
  const remove = (authorId: string) => {
    const before = reviews;
    setReviews(reviews.filter((r) => r.author.id !== authorId));
    if (authorId === me?.id) {
      setScores({});
      setBody("");
      setSaved(false);
    }
    deleteReview(companyId, authorId).catch(() => setReviews(before));
  };
  const sendReply = (authorId: string) => {
    const text = draft.trim();
    if (!text) return;
    const before = reviews;
    setReviews(reviews.map((r) => (r.author.id === authorId ? { ...r, reply: text } : r)));
    setReplying(null);
    setDraft("");
    replyToReview(companyId, authorId, text).catch(() => setReviews(before));
  };
  const dropReply = (authorId: string) => {
    const before = reviews;
    setReviews(reviews.map((r) => (r.author.id === authorId ? { ...r, reply: null } : r)));
    removeReviewReply(companyId, authorId).catch(() => setReviews(before));
  };

  const critAvg = criteria
    .map((c) => {
      const v = shown.map((r) => r.criteria[c]).filter(Boolean);
      return v.length ? ([c, Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 10) / 10] as const) : null;
    })
    .filter((x): x is readonly [string, number] => !!x);
  const stars = (v: number, lg?: boolean) => (
    <span className={`bzst${lg ? " lg" : ""}`} role="img" aria-label={`${v.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={v >= i - 0.25 ? "on" : v >= i - 0.75 ? "half" : ""}>★</span>
      ))}
    </span>
  );

  return (
    <>
      <div className="card">
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-start" }}>
          <div className="stack grow" style={{ gap: 4, flexBasis: 200 }}>
            <h2>Reviews</h2>
            {shown.length > 0 ? (
              <>
                <span className="bzbig">{average.toFixed(1)}</span>
                {stars(average, true)}
                <span className="muted small">{shown.length} published {shown.length === 1 ? "review" : "reviews"}</span>
              </>
            ) : (
              <span className="muted">No reviews yet.</span>
            )}
          </div>
          {critAvg.length > 0 && (
            <dl className="bzdl small">
              {critAvg.map(([c, v]) => (
                <Fragment key={c}>
                  <dt>{c}</dt>
                  <dd>{stars(v)} {v.toFixed(1)}</dd>
                </Fragment>
              ))}
            </dl>
          )}
        </div>
        {!me && <Link href="/auth/login" className="btn sm" style={{ alignSelf: "flex-start" }}>Join free to write a review</Link>}
        {mine?.status === "pending" && <p className="small bzpend">Your review is waiting for the Hub team. It does not count toward the rating until it is published.</p>}
        {canReview && me && (
          <div className="stack" style={{ gap: 10, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <strong>{mine ? "Your review" : "Worked with this business? Leave a review"}</strong>
            {criteria.map((c) => (
              <div key={c} className="row" style={{ flexWrap: "wrap", justifyContent: "space-between" }} role="group" aria-label={c}>
                <span>{c}</span>
                <span className="bzrate">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${c}: ${i} ${i === 1 ? "star" : "stars"}`}
                      aria-pressed={scores[c] === i}
                      className={i <= (scores[c] ?? 0) ? "on" : ""}
                      style={{ fontSize: 28 }}
                      onClick={() => {
                        setScores({ ...scores, [c]: i });
                        setSaved(false);
                      }}
                    >
                      ★
                    </button>
                  ))}
                </span>
              </div>
            ))}
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setSaved(false);
              }}
              rows={2}
              maxLength={1000}
              placeholder="What was it like to work with them? (optional)"
              aria-label="Your review"
              className="field"
            />
            {error && <p className="small sterr" role="alert">{error}</p>}
            <button type="button" onClick={submit} disabled={saved} className="btn sm" style={{ alignSelf: "flex-start" }}>
              {saved ? "Saved" : mine ? "Update review" : "Post review"}
            </button>
          </div>
        )}
      </div>

      {shown.map((r) => (
        <div key={r.author.id} className="card bzrev">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Link href={`/members/${r.author.id}`} aria-hidden="true" tabIndex={-1}><AvatarImg person={r.author} size={36} /></Link>
            <div className="stack grow" style={{ gap: 3, minWidth: 0 }}>
              <span>
                <Link href={`/members/${r.author.id}`} className="namebtn">{r.author.full_name}</Link>
                {r.status !== "published" && <span className="pill warn" style={{ marginLeft: 6 }}>Pending</span>}
              </span>
              <span>
                {stars(r.rating)} <span className="muted small">{new Date(r.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
              </span>
              {Object.keys(r.criteria).length > 0 && <span className="muted small">{Object.entries(r.criteria).map(([k, v]) => `${k} ${v}/5`).join(", ")}</span>}
              {r.body && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.body}</p>}
              {r.reply && (
                <div className="bzreply">
                  <strong className="small">Reply from the business</strong>
                  <p className="small" style={{ whiteSpace: "pre-wrap" }}>{r.reply}</p>
                  {canReply && <button type="button" className="linkbtn small" onClick={() => dropReply(r.author.id)}>Remove reply</button>}
                </div>
              )}
            </div>
            {(r.author.id === me?.id || isStaff) && (
              <button type="button" aria-label="Delete review" className="linkbtn small" onClick={() => remove(r.author.id)}>Delete</button>
            )}
          </div>
          {canReply && !r.reply && (
            replying === r.author.id ? (
              <div className="stack" style={{ gap: 8 }}>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={1000} aria-label="Reply to this review" className="field" />
                <span className="row">
                  <button type="button" onClick={() => sendReply(r.author.id)} className="btn sm">Reply</button>
                  <button type="button" onClick={() => setReplying(null)} className="btn sm ghost">Cancel</button>
                </span>
              </div>
            ) : (
              <button type="button" className="linkbtn small" style={{ alignSelf: "flex-start", color: "var(--link)", fontWeight: 600 }} onClick={() => setReplying(r.author.id)}>
                Reply as the business
              </button>
            )
          )}
        </div>
      ))}
    </>
  );}

/** Group admins invite their connections; each row flips to Invited at once. */
export function InvitePanel({ groupId, candidates, invited }: { groupId: string; candidates: Author[]; invited: string[] }) {
  const [sent, setSent] = useState<Set<string>>(new Set(invited));
  const toggle = (id: string) => {
    const was = sent.has(id);
    const next = new Set(sent);
    if (was) next.delete(id);
    else next.add(id);
    setSent(next);
    (was ? removeGroupInvite(groupId, id) : inviteToGroup(groupId, id)).catch(() => setSent(sent));
  };
  return (
    <details className="panel group/inv">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
        Invite your connections
        <span className="text-xl font-normal text-primary transition-transform duration-200 group-open/inv:rotate-45">+</span>
      </summary>
      {candidates.length === 0 && <p className="border-t px-4 py-4 text-sm text-muted-foreground">All of your connections are already in this group, or you have none yet.</p>}
      {candidates.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
          <span className="flex min-w-0 items-center gap-3">
            <AvatarImg person={p} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{p.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{p.headline}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => toggle(p.id)}
            className={cx(
              "press inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors duration-150",
              sent.has(p.id) ? "border border-foreground/40 text-muted-foreground hover:bg-muted" : "border border-primary text-primary hover:bg-primary/10",
            )}
          >
            {sent.has(p.id) && <Check className="h-4 w-4" />}
            {sent.has(p.id) ? "Invited" : "Invite"}
          </button>
        </div>
      ))}
    </details>
  );
}

/** Follow flips at once; the server confirms in the background. */
export function FollowButton({ companyId, following, count, signedIn }: { companyId: string; following: boolean; count: number; signedIn: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(following);
  const [n, setN] = useState(count);
  const flip = () => {
    if (!signedIn) return router.push("/auth/login");
    const next = !on;
    setOn(next);
    setN(n + (next ? 1 : -1));
    toggleFollow(companyId, next).catch(() => {
      setOn(!next);
      setN(n);
    });
  };
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={flip}
      className={cx("press inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors", on ? "border border-foreground/40 text-muted-foreground hover:bg-muted" : "border border-primary text-primary hover:bg-primary/10")}
    >
      {on && <Check className="h-4 w-4" />}
      {on ? "Following" : "Follow"} · {n}
    </button>
  );
}
