"use client";

import { safetyPlain, showSafety } from "@/lib/safety/client";
import { useListMotion } from "@/components/zip/animated-list";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Reply, Trash2 } from "lucide-react";
import { addComment, deleteComment, editComment } from "@/app/(hub)/actions";
import type { CommentRow, Profile } from "@/lib/hub";
import { canEdit } from "@/lib/feed-rules";
import { LinkedText } from "@/components/zip/short-link";

type Me = (Pick<Profile, "id" | "full_name" | "avatar_url"> & { headline?: string | null }) | null;

const INPUT = "flex-1 px-3 py-2 rounded-xl bg-[#F5F5F6]/70 border border-[#E5E5E8] text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-blue-600";
const SEND = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors disabled:opacity-50";

/** Comments with one level of replies. Edit and delete follow the database's rules (a ten-minute edit window). */
export function CommentThread({
  postId,
  me,
  isStaff,
  closed,
  list,
  setList,
  onCount,
  onNote,
  flat = false,
  firstShown,
  more = 10,
}: {
  postId: string;
  me: Me;
  isStaff: boolean;
  closed: boolean;
  list: CommentRow[] | null;
  setList: (fn: (l: CommentRow[] | null) => CommentRow[] | null) => void;
  onCount: (by: number) => void;
  onNote: (text: string) => void;
  /** one flat list instead of replies under the comment they answer */
  flat?: boolean;
  /** comments shown at first, and how many more each "Load more" adds */
  firstShown?: number;
  more?: number;
}) {
  const [shown, setShown] = useState(firstShown ?? 99);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, start] = useTransition();
  const listRef = useListMotion<HTMLDivElement>();

  const { tops, replies } = useMemo(() => {
    const tops = (list ?? []).filter((c) => flat || !c.parent_id);
    const replies = new Map<string, CommentRow[]>();
    if (!flat) for (const c of list ?? []) if (c.parent_id) replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
    return { tops, replies };
  }, [list, flat]);

  // Motion phase 1: the comment appears the moment it is sent; if saving fails it is taken back out and the text returns
  const send = (body: string, parentId: string | null, done: () => void) => {
    if (!body.trim() || !me) return;
    const tmp: CommentRow = {
      id: `tmp-${Date.now()}`, body: body.trim().slice(0, 2000), created_at: new Date().toISOString(), edited_at: null, parent_id: parentId,
      author: { id: me.id, full_name: me.full_name, avatar_url: me.avatar_url, headline: me.headline ?? "", member_type: "owner" } as CommentRow["author"],
    };
    setList((l) => [...(l ?? []), tmp]);
    onCount(1);
    done();
    addComment(postId, body, parentId)
      .then((r) => {
        if ("id" in r) return setList((l) => (l ?? []).map((c) => (c.id === tmp.id ? r : c)));
        // Update 41: stopped by a welcome-week limit, or held for the Hub team to check
        setList((l) => (l ?? []).filter((c) => c.id !== tmp.id));
        onCount(-1);
        if ("held" in r) return onNote("Thanks. Your comment is being checked by the Hub team and will appear once it’s approved.");
        setDraft(body);
        if (!showSafety(r.error)) onNote(safetyPlain(r.error) ?? "Could not post your reply. Try again.");
      })
      .catch((e) => {
        setList((l) => (l ?? []).filter((c) => c.id !== tmp.id));
        onCount(-1);
        setDraft(body);
        onNote(e instanceof Error && e.message.includes("closed") ? "Comments are closed on this post." : "Could not post your reply. Try again.");
      });
  };

  const save = (c: CommentRow) => {
    start(async () => {
      try {
        const updated = await editComment(c.id, text);
        setList((l) => (l ?? []).map((x) => (x.id === c.id ? updated : x)));
        setEditing(null);
      } catch {
        onNote("The edit window has closed.");
        setEditing(null);
      }
    });
  };

  const remove = (c: CommentRow) => {
    const gone = new Set([c.id, ...(replies.get(c.id) ?? []).map((r) => r.id)]);
    setList((l) => (l ?? []).filter((x) => !gone.has(x.id)));
    onCount(-gone.size);
    deleteComment(c.id).catch(() => onNote("Could not delete the comment."));
  };

  const one = (c: CommentRow, isReply: boolean) => {
    const sending = c.id.startsWith("tmp-");
    const own = c.author.id === me?.id && !sending;
    return (
      <div key={c.id} aria-busy={sending || undefined} style={sending ? { opacity: 0.7 } : undefined} className={`cin group p-2.5 rounded-xl bg-[#F5F5F6]/75 border border-[#E5E5E8]/70 ${isReply ? "ml-6" : ""}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link href={`/members/${c.author.id}`} className="truncate text-xs font-bold text-zinc-900 hover:underline">
              {c.author.full_name || "Member"}
            </Link>
            {c.author.headline && <span className="truncate text-[0.6562rem] text-zinc-500">• {c.author.headline}</span>}
            {c.edited_at && <span className="text-[0.6562rem] text-zinc-400">(edited)</span>}
          </div>
          <div className="flex items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {own && canEdit(c.created_at) && (
              <button type="button" aria-label="Edit comment" onClick={() => { setEditing(c.id); setText(c.body); }} className="text-zinc-400 hover:text-zinc-900">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {(own || (isStaff && !sending)) && (
              <button type="button" aria-label="Delete comment" onClick={() => remove(c)} className="text-zinc-400 hover:text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {editing === c.id ? (
          <div className="mt-1.5 flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Edit your comment" className={INPUT} />
            <button type="button" disabled={busy || !text.trim()} onClick={() => save(c)} className={SEND}>Save</button>
            <button type="button" onClick={() => setEditing(null)} className="text-xs text-zinc-500">Cancel</button>
          </div>
        ) : (
          <p className="text-xs text-zinc-800 mt-1 leading-relaxed whitespace-pre-wrap break-words"><LinkedText text={c.body} /></p>
        )}
        {!flat && !isReply && me && !closed && !sending && (
          <button type="button" onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setDraft(""); }} className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-medium text-zinc-500 hover:text-zinc-900">
            <Reply className="h-3 w-3" /> Reply
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="cthread space-y-3">
      <div ref={listRef} className="space-y-2">
        {list === null && (
          <>
            <div className="skeleton h-14 w-full !rounded-xl" />
            <div className="skeleton h-14 w-2/3 !rounded-xl" />
          </>
        )}
        {tops.slice(0, shown).map((c) => (
          <div key={c.id} className="space-y-2">
            {one(c, false)}
            {(replies.get(c.id) ?? []).map((r) => one(r, true))}
            {replyTo === c.id && me && (
              <form
                className="ml-6 flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft, c.id, () => { setDraft(""); setReplyTo(null); });
                }}
              >
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} placeholder={`Reply to ${c.author.full_name || "this comment"}`} aria-label="Write a reply" className={INPUT} />
                <button type="submit" disabled={busy || !draft.trim()} className={SEND}>Reply</button>
              </form>
            )}
          </div>
        ))}
        {tops.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + more)} className="text-xs font-semibold text-blue-700 hover:underline">
            Load {Math.min(more, tops.length - shown)} more {tops.length - shown === 1 ? "comment" : "comments"}
          </button>
        )}
        {list?.length === 0 && <p className="text-xs text-zinc-500">No replies yet. Start the conversation.</p>}
      </div>

      {closed ? (
        <p className="rounded-xl bg-[#F5F5F6] px-3 py-2 text-xs text-zinc-600">Comments are closed on this post.</p>
      ) : me ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(replyTo ? "" : draft, null, () => setDraft(""));
          }}
          className="flex items-center gap-2"
        >
          <input value={replyTo ? "" : draft} onChange={(e) => setDraft(e.target.value)} disabled={!!replyTo} maxLength={2000} placeholder="Add a thoughtful reply..." aria-label="Add a comment" className={INPUT} />
          <button type="submit" disabled={busy || !!replyTo || !draft.trim()} className={SEND}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Comment
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-500">
          <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link> to join the conversation.
        </p>
      )}
    </div>
  );
}
