"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { markNotificationRead, markNotificationsRead } from "@/app/(hub)/actions";
import type { Author, LinkState } from "@/lib/hub";
import { ZipAv } from "@/components/zip/bits";
import { ConnectButton } from "@/components/network-client";

export type Note = {
  id: string;
  type: "like" | "comment" | "connection_request" | "connection_accepted" | "course_feedback" | "course_submission";
  href?: string | null;
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: Author;
  excerpt: string | null;
  link: LinkState;
};

const TEXT: Record<Note["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  connection_request: "invited you to connect",
  connection_accepted: "accepted your invitation. You are now connected",
  course_feedback: "graded your assignment. Your feedback is ready",
  course_submission: "submitted an assignment for you to grade",
};
const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
};

type Tab = "all" | "posts" | "network";

/** Filters switch in place and rows turn from unread to read the moment they are opened. */
export function NotificationsList({ initial }: { initial: Note[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initial);
  const [tab, setTab] = useState<Tab>("all");

  const shown = notes.filter((n) => tab === "all" || (tab === "posts" ? n.type === "like" || n.type === "comment" : n.type.startsWith("connection")));
  const unread = notes.filter((n) => !n.read_at).length;
  const href = (n: Note) => (n.href ? n.href : n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network/connections" : `/members/${n.actor.id}`);

  const read = (id: string) => {
    setNotes((all) => all.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    markNotificationRead(id).catch(() => {});
  };
  const readAll = () => {
    setNotes((all) => all.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    markNotificationsRead().catch(() => {});
  };

  const pill = (key: Tab, label: string) => (
    <button type="button" onClick={() => setTab(key)} aria-pressed={tab === key} className="chip">
      {label}
    </button>
  );

  return (
    <>
      <div className="pagehead"><h1>Notifications</h1></div>
      <div className="chips" role="group" aria-label="Show">
        {pill("all", "All")}
        {pill("posts", "My posts")}
        {pill("network", "Network")}
        {unread > 0 && (
          <button type="button" onClick={readAll} className="linkbtn" style={{ marginLeft: "auto", color: "var(--link)", fontWeight: 600 }}>
            Mark all as read
          </button>
        )}
      </div>

      <section className="card" style={{ padding: 0, gap: 0 }}>
        {shown.length === 0 && (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <p style={{ fontWeight: 600 }}>{tab === "all" ? "No notifications yet" : "Nothing here yet"}</p>
            <p className="muted small">When someone likes, comments or connects, you will see it here.</p>
          </div>
        )}
        {shown.map((n) => (
          <div
            key={n.id}
            role="link"
            tabIndex={0}
            onClick={() => {
              read(n.id);
              router.push(href(n));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                read(n.id);
                router.push(href(n));
              }
            }}
            className="row"
            style={{ alignItems: "flex-start", padding: "14px 16px", borderTop: "1px solid var(--line)", cursor: "pointer", background: n.read_at ? undefined : "var(--surface-2)" }}
          >
            <Link href={`/members/${n.actor.id}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flex: "none" }} aria-label={n.actor.full_name || "Member"}>
              <ZipAv name={n.actor.full_name || "Member"} src={n.actor.avatar_url} />
            </Link>
            <div className="grow stack" style={{ gap: 2 }}>
              <p>
                <strong>{n.actor.full_name || "A member"}</strong> {TEXT[n.type]}.
                {!n.read_at && <span className="sr"> Unread</span>}
              </p>
              {n.excerpt && <p className="muted small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.excerpt}</p>}
              {n.type === "connection_request" && n.link === "received" && (
                <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                  <ConnectButton otherId={n.actor.id} initial="received" signedIn onChange={() => read(n.id)} />
                </div>
              )}
            </div>
            {!n.read_at && <span className="actdot" aria-hidden="true" style={{ marginTop: 8 }} />}
            <span className="muted small" style={{ flex: "none" }}>{ago(n.created_at)}</span>
          </div>
        ))}
      </section>
    </>
  );
}
