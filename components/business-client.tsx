"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <h2 className="text-base font-semibold">Reviews</h2>
        {shown.length > 0 ? (
          <span className="flex items-center gap-2 text-sm">
            <Stars value={average} />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-muted-foreground">
              from {shown.length} {shown.length === 1 ? "review" : "reviews"}
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No reviews yet</span>
        )}
      </div>

      {canReview && (
        <div className="border-t bg-muted/50 px-4 py-3">
          <p className="text-sm font-semibold">{mine ? "Your review" : me ? "Worked with this business? Leave a review" : "Sign in to leave a review"}</p>
          <div className="mt-2 grid gap-2">
            {criteria.map((c) => (
              <div key={c} className="flex flex-wrap items-center justify-between gap-2" role="group" aria-label={c}>
                <span className="text-sm">{c}</span>
                <span className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${c}: ${i} ${i === 1 ? "star" : "stars"}`}
                      aria-pressed={scores[c] === i}
                      onClick={() => {
                        setScores({ ...scores, [c]: i });
                        setSaved(false);
                      }}
                      className="press p-0.5"
                    >
                      <Star className={cx("h-6 w-6 transition-colors duration-100", i <= (scores[c] ?? 0) ? "fill-amber-400 text-amber-400" : "text-foreground/25")} />
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
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
            className="field mt-2 resize-none"
          />
          {error && <p className="mt-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {mine?.status === "pending" && <p className="mt-2 text-xs text-muted-foreground">Your review is waiting for the team to approve it.</p>}
          <button
            type="button"
            onClick={submit}
            disabled={saved}
            className={cx("press mt-2 inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors", saved ? "bg-emerald-50 text-emerald-700" : "bg-primary text-white hover:bg-primary/90")}
          >
            {saved && <Check className="h-4 w-4 animate-pop" />}
            {saved ? "Saved" : mine ? "Update review" : "Post review"}
          </button>
        </div>
      )}

      {shown.map((r) => (
        <div key={r.author.id} className="group flex animate-rise gap-3 border-t px-4 py-3">
          <Link href={`/members/${r.author.id}`} className="shrink-0">
            <AvatarImg person={r.author} size={48} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/members/${r.author.id}`} className="truncate text-sm font-semibold hover:underline">
                {r.author.full_name}
              </Link>
              {(r.author.id === me?.id || isStaff) && (
                <button type="button" aria-label="Delete review" onClick={() => remove(r.author.id)} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-rose-600 focus:opacity-100 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{r.author.headline}</p>
            <Stars value={r.rating} size={14} />
            {Object.keys(r.criteria).length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {Object.entries(r.criteria)
                  .map(([k, v]) => `${k} ${v}/5`)
                  .join(", ")}
              </p>
            )}
            {r.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{r.body}</p>}
            {r.reply && (
              <div className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground">Reply from the business</p>
                <p className="whitespace-pre-wrap break-words">{r.reply}</p>
                {canReply && (
                  <button type="button" onClick={() => dropReply(r.author.id)} className="mt-1 text-xs font-semibold text-rose-700 hover:underline">
                    Remove reply
                  </button>
                )}
              </div>
            )}
            {canReply && !r.reply && (
              <div className="mt-2">
                {replying === r.author.id ? (
                  <div className="grid gap-2">
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={1000} aria-label="Reply to this review" className="field resize-none" />
                    <span className="flex gap-2">
                      <button type="button" onClick={() => sendReply(r.author.id)} className="press rounded-xl bg-primary px-3 py-1 text-sm font-semibold text-white">
                        Reply
                      </button>
                      <button type="button" onClick={() => setReplying(null)} className="rounded-xl px-3 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted">
                        Cancel
                      </button>
                    </span>
                  </div>
                ) : (
                  <button type="button" onClick={() => setReplying(r.author.id)} className="text-xs font-semibold text-primary hover:underline">
                    Reply as the business
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

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
