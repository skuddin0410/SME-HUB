"use client";

import { safetyPlain, showSafety } from "@/lib/safety/client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Pin, PinOff, MessageSquareOff, MessageSquare } from "lucide-react";
import { quotePost, setCommentsClosed, setProfilePin, votePoll } from "@/app/(hub)/actions";
import { pollShares } from "@/lib/feed-rules";
import type { PollData, QuotedPost } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

const BTN = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-[#F5F5F6] hover:text-zinc-900";

/** A poll. Results show after you vote or once it has closed; votes are anonymous. */
export function PollView({ postId, poll, signedIn }: { postId: string; poll: PollData; signedIn: boolean }) {
  const router = useRouter();
  const [mine, setMine] = useState(poll.myVote);
  const [votes, setVotes] = useState(poll.options.map((o) => o.votes));
  const [error, setError] = useState<string | null>(null);
  const closed = new Date(poll.closesAt).getTime() <= Date.now();
  const showResults = closed || !!mine;
  const shares = pollShares(votes);
  const total = votes.reduce((a, b) => a + b, 0);

  const vote = (i: number) => {
    if (!signedIn) return router.push("/auth/login");
    if (mine || closed) return;
    setMine(poll.options[i].id);
    setVotes((v) => v.map((n, j) => (j === i ? n + 1 : n)));
    votePoll(postId, poll.options[i].id).catch(() => {
      setMine(null);
      setVotes((v) => v.map((n, j) => (j === i ? n - 1 : n)));
      setError("Could not save your vote. Try again.");
    });
  };

  return (
    <div className="space-y-2 rounded-xl border border-[#E5E5E8] p-3" role="group" aria-label="Poll">
      {poll.options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          disabled={showResults}
          onClick={() => vote(i)}
          className="relative w-full overflow-hidden rounded-lg border border-[#E5E5E8] bg-white px-3 py-2 text-left text-xs text-zinc-900 enabled:hover:border-blue-600 disabled:cursor-default"
        >
          {showResults && <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-blue-100" style={{ width: `${shares[i]}%` }} />}
          <span className="relative flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              {mine === o.id && <Check className="h-3.5 w-3.5 text-blue-700" aria-label="Your vote" />}
              {o.label}
            </span>
            {showResults && <span className="tabular-nums font-semibold">{shares[i]}%</span>}
          </span>
        </button>
      ))}
      <p className="text-[0.75rem] text-zinc-500" role="status">
        {error ?? `${total} ${total === 1 ? "vote" : "votes"} · ${closed ? "Poll closed" : `Closes ${new Date(poll.closesAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`}`}
      </p>
    </div>
  );
}

/** The post someone quoted, shown inside the quoting post. */
export function QuoteEmbed({ quoted }: { quoted: QuotedPost }) {
  return (
    <Link href={`/posts/${quoted.id}`} className="block rounded-xl border border-[#E5E5E8] bg-[#F5F5F6]/60 p-3 hover:bg-[#F5F5F6]">
      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
        <AvatarImg person={quoted.author} size={20} />
        {quoted.author.full_name || "Member"}
      </span>
      {quoted.title && <span className="mt-1 block text-[0.875rem] font-semibold text-zinc-900">{quoted.title}</span>}
      <span className="mt-1 line-clamp-3 block whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">{quoted.body}</span>
    </Link>
  );
}

/** Quote a post with your own words. */
export function QuoteButton({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  // the Quote icon in the post's action row (PostActions) opens this form
  useEffect(() => {
    const onQuote = (e: Event) => { if ((e as CustomEvent<string>).detail !== postId) return; if (signedIn) setOpen(true); else router.push("/auth/login"); };
    window.addEventListener("zip:quote", onQuote);
    return () => window.removeEventListener("zip:quote", onQuote);
  }, [postId, signedIn, router]);
  if (!open) return null;
  return (
    <form
      className="mt-2 w-full space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            const r = await quotePost(postId, text);
            if (r.error) return void (showSafety(r.error) || setError(safetyPlain(r.error) ?? r.error));
            setOpen(false);
            setText("");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not quote this post.");
          }
        });
      }}
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={5000} required aria-label="Your words" placeholder="Add your own words" className="w-full rounded-xl border border-[#E5E5E8] p-2.5 text-xs focus:border-blue-600 focus:outline-none" />
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !text.trim()} className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">Post quote</button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500">Cancel</button>
      </div>
    </form>
  );
}

/** For the author: edit inside the window, pin to profile, close or open comments. */
export function PostManage({ post }: { post: { id: string; profile_pinned: boolean; comments_closed: boolean } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = (fn: () => Promise<void>, fallback: string) =>
    start(async () => {
      try {
        await fn();
        setError(null);
        router.refresh();
      } catch {
        setError(fallback);
      }
    });

  // Update 26: editing moved to the post's "…" menu and its own window (components/zip/edit-post.tsx)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 border-t border-[#F5F5F6] pt-2">
        <button type="button" disabled={busy} onClick={() => run(() => setProfilePin(post.id, !post.profile_pinned), "Could not change the pin.")} className={BTN}>
          {post.profile_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          {post.profile_pinned ? "Unpin from profile" : "Pin to profile"}
        </button>
        <button type="button" disabled={busy} onClick={() => run(() => setCommentsClosed(post.id, !post.comments_closed), "Could not change comments.")} className={BTN}>
          {post.comments_closed ? <MessageSquare className="h-3.5 w-3.5" /> : <MessageSquareOff className="h-3.5 w-3.5" />}
          {post.comments_closed ? "Open comments" : "Close comments"}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
