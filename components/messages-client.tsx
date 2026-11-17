"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/(hub)/actions";

export type Msg = { id: string; sender_id: string; body: string; created_at: string };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const clock = (iso: string) => new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** One conversation: history, live updates and the reply box. */
export function Thread({ meId, otherId, initial, prefill }: { meId: string; otherId: string; initial: Msg[]; prefill: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Msg[]>([]);
  const [draft, setDraft] = useState(prefill);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  // messages already confirmed by the server drop out of the pending list
  const known = new Set(initial.map((m) => m.body + m.sender_id));
  const messages = [...initial, ...pending.filter((m) => !known.has(m.body + m.sender_id))];

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // new messages addressed to me arrive live
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${meId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${meId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, router]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    setDraft("");
    setPending((p) => [...p, { id: `tmp-${Date.now()}`, sender_id: meId, body, created_at: new Date().toISOString() }]);
    startTransition(async () => {
      try {
        await sendMessage(otherId, body);
        router.refresh();
      } catch (e) {
        setPending((p) => p.filter((m) => m.body !== body));
        setDraft(body);
        setError(e instanceof Error ? e.message : "Could not send. Try again.");
      }
    });
  };

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={cx("flex", mine && "justify-end")}>
              <div
                title={clock(m.created_at)}
                className={cx(
                  "max-w-[78%] animate-rise whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-5",
                  mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-muted",
                  m.id.startsWith("tmp-") && "opacity-70",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      {error && <p className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex items-end gap-2 border-t p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={draft.length > 80 ? 3 : 1}
          maxLength={4000}
          placeholder="Write a message"
          aria-label="Write a message"
          className="field resize-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !draft.trim()}
          aria-label="Send message"
          className="press rounded-full bg-primary p-2.5 text-white disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}
