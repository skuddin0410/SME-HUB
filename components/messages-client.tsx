"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Send, SquarePen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markThreadRead, sendMessage } from "@/app/(hub)/actions";
import type { Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

export type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null };

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
const short = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? clock(iso) : d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
};

type Filter = "all" | "unread" | "connections";

/**
 * The whole inbox lives in the browser once loaded, so switching conversations, filtering,
 * searching and sending are all instant. New messages arrive over a live connection.
 */
export function MessagingApp({
  me,
  people,
  initialMessages,
  startWith,
  prefill,
}: {
  me: Author;
  people: Author[];
  initialMessages: Msg[];
  startWith: string | null;
  prefill: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [active, setActive] = useState<string | null>(startWith);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(startWith && prefill ? { [startWith]: prefill } : {});
  const [pendingShare, setPendingShare] = useState(startWith ? "" : prefill);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // conversations, newest first
  const threads = useMemo(() => {
    const map = new Map<string, { last: Msg; unread: number }>();
    for (const m of [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      const t = map.get(other) ?? { last: m, unread: 0 };
      t.last = m;
      if (m.recipient_id === me.id && !m.read_at) t.unread++;
      map.set(other, t);
    }
    return [...map.entries()]
      .map(([id, t]) => ({ id, person: byId.get(id), ...t }))
      .filter((t) => t.person)
      .sort((a, b) => b.last.created_at.localeCompare(a.last.created_at));
  }, [messages, me.id, byId]);

  const q = query.trim().toLowerCase();
  const listed = threads.filter(
    (t) => (filter !== "unread" || t.unread > 0) && (!q || t.person!.full_name.toLowerCase().includes(q) || t.last.body.toLowerCase().includes(q)),
  );
  const started = new Set(threads.map((t) => t.id));
  const fresh = people.filter((p) => !started.has(p.id) && (!q || p.full_name.toLowerCase().includes(q)));
  const other = active ? byId.get(active) : undefined;
  const history = active
    ? messages.filter((m) => m.sender_id === active || m.recipient_id === active).sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  const open = (id: string) => {
    setActive(id);
    setError(null);
    if (pendingShare) {
      setDrafts((d) => ({ ...d, [id]: d[id] ? d[id] : pendingShare }));
      setPendingShare("");
    }
    window.history.replaceState(null, "", `/messages?with=${id}`);
  };

  // reading a conversation clears its unread mark at once
  useEffect(() => {
    if (!active) return;
    setMessages((all) => (all.some((m) => m.sender_id === active && !m.read_at) ? all.map((m) => (m.sender_id === active && !m.read_at ? { ...m, read_at: new Date().toISOString() } : m)) : all));
    markThreadRead(active).catch(() => {});
    box.current?.focus();
  }, [active, messages.length]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [active, history.length]);

  // live delivery
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me.id}` }, (payload) => {
        const m = payload.new as Msg;
        setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me.id]);

  const send = () => {
    if (!active) return;
    const body = (drafts[active] ?? "").trim();
    if (!body) return;
    const temp: Msg = { id: `tmp-${Date.now()}`, sender_id: me.id, recipient_id: active, body, created_at: new Date().toISOString(), read_at: null };
    setMessages((all) => [...all, temp]);
    setDrafts((d) => ({ ...d, [active]: "" }));
    setError(null);
    sendMessage(active, body)
      .then((saved) => setMessages((all) => all.map((m) => (m.id === temp.id ? { ...m, id: saved.id, created_at: saved.created_at } : m))))
      .catch((e) => {
        setMessages((all) => all.filter((m) => m.id !== temp.id));
        setDrafts((d) => ({ ...d, [active]: body }));
        setError(e instanceof Error ? e.message : "Could not send. Try again.");
      });
  };

  const pill = (key: Filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={cx(
        "press rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150",
        filter === key ? "bg-emerald-700 text-white" : "border border-foreground/50 text-muted-foreground hover:bg-muted hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.5)]",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="panel flex h-[calc(100vh-108px)] min-h-[480px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <h1 className="text-base font-semibold">Messaging</h1>
        <label className="relative hidden w-56 sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages"
            aria-label="Search messages"
            className="w-full rounded bg-[hsl(214_45%_94%)] py-1.5 pl-8 pr-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <button type="button" onClick={() => setFilter("connections")} title="New message" aria-label="New message" className="press ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          <SquarePen className="h-5 w-5" />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto border-b px-4 py-2">
        {pill("all", "Focused")}
        {pill("unread", "Unread")}
        {pill("connections", "Connections")}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[312px_minmax(0,1fr)]">
        <div className={cx("min-h-0 overflow-y-auto border-r", active ? "hidden md:block" : "block")}>
          {pendingShare && <p className="bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">Choose who to send this post to.</p>}
          {filter !== "connections" &&
            listed.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => open(t.id)}
                className={cx(
                  "flex w-full items-center gap-3 border-b border-l-4 px-3 py-3 text-left transition-colors duration-100",
                  t.id === active ? "border-l-emerald-700 bg-[hsl(214_60%_95%)]" : "border-l-transparent hover:bg-muted",
                )}
              >
                <AvatarImg person={t.person!} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={cx("truncate text-base", t.unread ? "font-semibold" : "font-normal")}>{t.person!.full_name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{short(t.last.created_at)}</span>
                  </span>
                  <span className={cx("line-clamp-2 text-sm leading-5", t.unread ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {t.last.sender_id === me.id ? "You: " : ""}
                    {t.last.body}
                  </span>
                </span>
                {t.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-[18px] text-white">{t.unread}</span>}
              </button>
            ))}
          {filter !== "connections" && listed.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {filter === "unread" ? "You are all caught up." : q ? "No conversations match." : "No conversations yet."}
            </p>
          )}
          {(filter === "connections" || threads.length === 0) && (
            <>
              <p className="px-4 pb-1 pt-3 text-xs font-semibold text-muted-foreground">Start a conversation</p>
              {fresh.map((p) => (
                <button key={p.id} type="button" onClick={() => open(p.id)} className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-muted">
                  <AvatarImg person={p} size={40} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.headline}</span>
                  </span>
                </button>
              ))}
              {fresh.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Messages are between connections.{" "}
                  <Link href="/network" className="font-semibold text-primary hover:underline">
                    Grow your network
                  </Link>
                </p>
              )}
            </>
          )}
        </div>

        <div className={cx("min-h-0 flex-col", active ? "flex" : "hidden md:flex")}>
          {other ? (
            <>
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <button type="button" onClick={() => setActive(null)} className="rounded-full p-1.5 hover:bg-muted md:hidden" aria-label="Back to conversations">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Link href={`/members/${other.id}`} className="min-w-0">
                  <span className="block truncate text-sm font-semibold hover:underline">{other.full_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{other.headline || "SMB Hub member"}</span>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="border-b px-4 py-5">
                  <AvatarImg person={other} size={72} />
                  <Link href={`/members/${other.id}`} className="mt-2 block text-base font-semibold hover:underline">
                    {other.full_name}
                  </Link>
                  <p className="text-sm">{other.headline || "SMB Hub member"}</p>
                </div>
                <div className="px-4 pb-4">
                  {history.map((m, i) => {
                    const prev = history[i - 1];
                    const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                    const grouped = !newDay && prev.sender_id === m.sender_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000;
                    const who = m.sender_id === me.id ? me : other;
                    return (
                      <div key={m.id}>
                        {newDay && (
                          <p className="my-3 flex items-center gap-3 text-xs font-semibold text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                            {dayLabel(m.created_at)}
                          </p>
                        )}
                        <div className={cx("-mx-2 flex gap-3 rounded px-2 transition-colors hover:bg-muted/60", grouped ? "py-0.5" : "pt-2", m.id.startsWith("tmp-") && "opacity-60")}>
                          <span className="w-10 shrink-0">{!grouped && <AvatarImg person={who} size={40} />}</span>
                          <span className="min-w-0 flex-1">
                            {!grouped && (
                              <span className="flex items-baseline gap-1.5">
                                <span className="text-sm font-semibold">{who.full_name}</span>
                                <span className="text-xs text-muted-foreground">{clock(m.created_at)}</span>
                              </span>
                            )}
                            <span className="block whitespace-pre-wrap break-words text-sm leading-5">{m.body}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={end} />
                </div>
              </div>

              {error && <p className="mx-3 mb-2 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <div className="border-t bg-[hsl(220_33%_98%)] p-3">
                <textarea
                  ref={box}
                  value={drafts[other.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [other.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={3}
                  maxLength={4000}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="w-full resize-none rounded bg-[hsl(214_45%_94%)] px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Press Enter to send, Shift + Enter for a new line</span>
                  <button
                    type="button"
                    onClick={send}
                    disabled={!(drafts[other.id] ?? "").trim()}
                    className="press inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="m-auto max-w-xs px-6 text-center">
              <p className="text-base font-semibold">Your messages</p>
              <p className="mt-1 text-sm text-muted-foreground">Pick a conversation on the left, or start one with a connection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
