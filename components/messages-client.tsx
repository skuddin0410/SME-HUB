"use client";

import { safetyPlain, showSafety } from "@/lib/safety/client";
import { ScamWarning } from "@/components/safety/scam-warning";
import { LinkedText } from "@/components/zip/short-link";
import { useListMotion } from "@/components/zip/animated-list";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { markThreadRead, sendMessage } from "@/app/(hub)/actions";
import type { Author } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { MapleThreadLink } from "@/components/maple/dock";

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
  scamWords = [],
}: {
  me: Author;
  people: Author[];
  initialMessages: Msg[];
  startWith: string | null;
  prefill: string;
  /** Update 41: the team's scam word list, for the "Be careful with this message" warning */
  scamWords?: string[];
}) {
  const threadsRef = useListMotion<HTMLDivElement>();
  const historyRef = useListMotion<HTMLDivElement>();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [active, setActive] = useState<string | null>(startWith);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(startWith && prefill ? { [startWith]: prefill } : {});
  const [pendingShare, setPendingShare] = useState(startWith ? "" : prefill);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
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
      .then((saved) => {
        if ("id" in saved) return setMessages((all) => all.map((m) => (m.id === temp.id ? { ...m, id: saved.id, created_at: saved.created_at } : m)));
        // Update 41: a welcome-week or daily limit, or held for the Hub team to check
        setMessages((all) => all.filter((m) => m.id !== temp.id));
        if ("held" in saved) return setError("Your message is being checked by the Hub team. It’s delivered once it’s approved.");
        setDrafts((d) => ({ ...d, [active]: body }));
        if (!showSafety(saved.error)) setError(safetyPlain(saved.error) ?? "Could not send. Try again.");
      })
      .catch((e) => {
        setMessages((all) => all.filter((m) => m.id !== temp.id));
        setDrafts((d) => ({ ...d, [active]: body }));
        setError(e instanceof Error ? e.message : "Could not send. Try again.");
      });
  };

  // Motion phase 2: a moved conversation and a new message slide into place
  const pill = (key: Filter, label: string) => (
    <button type="button" className="chip" onClick={() => setFilter(key)} aria-pressed={filter === key}>
      {label}
    </button>
  );

  return (
    <div className="msgs">
      <div ref={threadsRef} className={cx("card threads", active && "hide-sm")} style={{ gap: 4 }}>
        <MapleThreadLink />
        <label className="sr" htmlFor="msq">Search messages</label>
        <input id="msq" className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search messages" style={{ marginBottom: 6 }} />
        <div className="chips" role="group" aria-label="Show" style={{ marginBottom: 6 }}>
          {pill("all", "Focused")}
          {pill("unread", "Unread")}
          {pill("connections", "Connections")}
        </div>
        {pendingShare && <p className="small" style={{ color: "var(--link)", fontWeight: 600 }}>Choose who to send this post to.</p>}
        {filter !== "connections" &&
          listed.map((t) => (
            <button key={t.id} type="button" className="thread" aria-current={t.id === active} onClick={() => open(t.id)}>
              <ZipAv name={t.person!.full_name} src={t.person!.avatar_url} />
              <span className="stack grow" style={{ minWidth: 0 }}>
                <strong style={{ fontWeight: t.unread ? 700 : 600 }}>{t.person!.full_name}</strong>
                <span className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.last.sender_id === me.id ? "You: " : ""}
                  {t.last.body}
                </span>
              </span>
              <span className="muted small">{short(t.last.created_at)}</span>
              {t.unread > 0 && <span className="pill warn">{t.unread}</span>}
            </button>
          ))}
        {filter !== "connections" && listed.length === 0 && (
          <p className="muted small" style={{ padding: 12, textAlign: "center" }}>{filter === "unread" ? "You are all caught up." : q ? "No conversations match." : "No conversations yet."}</p>
        )}
        {(filter === "connections" || threads.length === 0) && (
          <>
            <span className="eyebrow" style={{ padding: "8px 10px 2px" }}>Start a conversation</span>
            {fresh.map((p) => (
              <button key={p.id} type="button" className="thread" onClick={() => open(p.id)}>
                <ZipAv name={p.full_name} src={p.avatar_url} size="s" />
                <span className="stack grow" style={{ minWidth: 0 }}>
                  <strong>{p.full_name}</strong>
                  <span className="muted small">{p.headline}</span>
                </span>
              </button>
            ))}
            {fresh.length === 0 && (
              <p className="muted small" style={{ padding: 12, textAlign: "center" }}>
                Messages are between connections. <Link href="/network" style={{ color: "var(--link)", fontWeight: 600 }}>Grow your network</Link>
              </p>
            )}
          </>
        )}
      </div>

      <div className={cx("card conv", !active && "hide-sm")}>
        {other ? (
          <>
            <div className="row">
              <button type="button" className="btn ghost sm show-sm" onClick={() => setActive(null)} aria-label="Back to conversations">← Back</button>
              <ZipAv name={other.full_name} src={other.avatar_url} />
              <div className="stack grow">
                <Link href={`/members/${other.id}`} className="namebtn">{other.full_name}</Link>
                <span className="muted small">{other.headline || "SME Hub member"}</span>
              </div>
            </div>
            <div ref={historyRef} className="stack" style={{ gap: 8, padding: "12px 0", borderTop: "1px solid var(--line)", maxHeight: 460, overflowY: "auto" }}>
              {history.map((m, i) => {
                const prev = history[i - 1];
                const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                return (
                  <div key={m.id} className="stack" style={{ gap: 8 }}>
                    {newDay && <span className="muted small" style={{ textAlign: "center" }}>{dayLabel(m.created_at)}</span>}
                    {m.sender_id !== me.id && <ScamWarning body={m.body} words={scamWords} from={m.sender_id} />}
                    <div className={cx("bubble", m.sender_id === me.id && "mine")} style={m.id.startsWith("tmp-") ? { opacity: 0.6 } : undefined} title={clock(m.created_at)}>
                      <LinkedText text={m.body} />
                    </div>
                  </div>
                );
              })}
              <div ref={end} />
            </div>
            {error && <p className="small sterr" role="alert">{error}</p>}
            <div className="row">
              <label className="sr" htmlFor="mdraft">Write a message</label>
              <input
                id="mdraft"
                ref={box}
                className="field grow"
                value={drafts[other.id] ?? ""}
                maxLength={4000}
                placeholder="Write a message"
                onChange={(e) => setDrafts((d) => ({ ...d, [other.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="btn" onClick={send} disabled={!(drafts[other.id] ?? "").trim()}>Send</button>
            </div>
          </>
        ) : (
          <div className="stack" style={{ margin: "auto", textAlign: "center", maxWidth: 320, padding: 24 }}>
            <strong>Your messages</strong>
            <span className="muted small">Pick a conversation on the left, or start one with a connection.</span>
          </div>
        )}
      </div>
    </div>
  );
}
