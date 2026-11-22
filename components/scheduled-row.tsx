"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, publishScheduledNow, rescheduleScheduled } from "@/app/(hub)/actions";

const BTN = "rounded-xl border border-[#E5E5E8] bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-[#F5F5F6] disabled:opacity-60";

/** One scheduled post: publish it now, move it, or cancel it. */
export function ScheduledRow({ id, title, body, scheduledAt }: { id: string; title: string; body: string; scheduledAt: string }) {
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
        setError(null);
        setMoving(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  return (
    <li className="panel space-y-2 p-4">
      <p className="text-[11px] font-semibold text-blue-700">
        Goes live {new Date(scheduledAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
      </p>
      {title && <p className="font-display text-sm font-bold text-zinc-900">{title}</p>}
      <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">{body}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => publishScheduledNow(id))} className={BTN}>Publish now</button>
        <button type="button" onClick={() => setMoving((v) => !v)} className={BTN}>Change time</button>
        <button type="button" disabled={busy} onClick={() => run(() => deletePost(id))} className={`${BTN} !text-rose-700`}>Cancel post</button>
      </div>
      {moving && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => rescheduleScheduled(id, new Date(when).toISOString()));
          }}
        >
          <input type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} aria-label="New date and time" className="rounded-lg border border-[#E5E5E8] px-2.5 py-1.5 text-xs" />
          <button type="submit" disabled={busy || !when} className={BTN}>Save time</button>
        </form>
      )}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </li>
  );
}
