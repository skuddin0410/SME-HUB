"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Star, Trash2 } from "lucide-react";
import { deleteReview, inviteToGroup, removeGroupInvite, saveReview } from "@/app/(hub)/actions";
import type { Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-foreground/25"} />
      ))}
    </span>
  );
}

export type Review = { author: Author; rating: number; body: string; created_at: string };

/** Reviews update on screen the moment they are sent; the average follows. */
export function Reviews({
  companyId,
  initial,
  me,
  canReview,
  isStaff,
}: {
  companyId: string;
  initial: Review[];
  me: Author | null;
  canReview: boolean;
  isStaff: boolean;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initial);
  const mine = me ? reviews.find((r) => r.author.id === me.id) : undefined;
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(mine?.body ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  const submit = () => {
    if (!me) return router.push("/auth/login");
    if (!rating) return setError("Pick a star rating first.");
    const before = reviews;
    setError(null);
    setSaved(true);
    setReviews([{ author: me, rating, body: body.trim(), created_at: new Date().toISOString() }, ...reviews.filter((r) => r.author.id !== me.id)]);
    saveReview(companyId, rating, body).catch(() => {
      setReviews(before);
      setSaved(false);
      setError("Could not save your review. Try again.");
    });
  };
  const remove = (authorId: string) => {
    const before = reviews;
    setReviews(reviews.filter((r) => r.author.id !== authorId));
    if (authorId === me?.id) {
      setRating(0);
      setBody("");
      setSaved(false);
    }
    deleteReview(companyId, authorId).catch(() => setReviews(before));
  };

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <h2 className="text-base font-semibold">Reviews</h2>
        {reviews.length > 0 ? (
          <span className="flex items-center gap-2 text-sm">
            <Stars value={average} />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-muted-foreground">
              from {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No reviews yet</span>
        )}
      </div>

      {canReview && (
        <div className="border-t bg-muted/50 px-4 py-3">
          <p className="text-sm font-semibold">{mine ? "Your review" : me ? "Worked with this business? Leave a review" : "Sign in to leave a review"}</p>
          <div className="mt-1 flex" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i} ${i === 1 ? "star" : "stars"}`}
                aria-pressed={rating === i}
                onMouseEnter={() => setHover(i)}
                onClick={() => {
                  setRating(i);
                  setSaved(false);
                }}
                className="press p-0.5"
              >
                <Star className={cx("h-7 w-7 transition-colors duration-100", i <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-foreground/25")} />
              </button>
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

      {reviews.map((r) => (
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
            {r.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5">{r.body}</p>}
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
