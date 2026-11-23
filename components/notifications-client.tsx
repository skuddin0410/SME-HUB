"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { markNotificationRead, markNotificationsRead } from "@/app/(hub)/actions";
import type { Author, LinkState } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";
import { ConnectButton } from "@/components/network-client";

export type Note = {
  id: string;
  type: "like" | "comment" | "connection_request" | "connection_accepted";
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: Author;
  excerpt: string | null;
  link: LinkState;
};

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
const TEXT: Record<Note["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  connection_request: "invited you to connect",
  connection_accepted: "accepted your invitation. You are now connected",
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
  const href = (n: Note) => (n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network/connections" : `/members/${n.actor.id}`);

  const read = (id: string) => {
    setNotes((all) => all.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    markNotificationRead(id).catch(() => {});
  };
  const readAll = () => {
    setNotes((all) => all.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    markNotificationsRead().catch(() => {});
  };

  const pill = (key: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      aria-pressed={tab === key}
      className={cx(
        "press rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150",
        tab === key ? "bg-emerald-700 text-white" : "border border-foreground/50 text-muted-foreground hover:bg-muted hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.5)]",
      )}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="panel flex flex-wrap items-center gap-2 px-4 py-3">
        {pill("all", "All")}
        {pill("posts", "My posts")}
        {pill("network", "Network")}
        {unread > 0 && (
          <button type="button" onClick={readAll} className="press ml-auto inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
        )}
      </div>

      <section className="panel overflow-hidden">
        {shown.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-base font-semibold">{tab === "all" ? "No notifications yet" : "Nothing here yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">When someone likes, comments or connects, you will see it here.</p>
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
            className={cx(
              "flex cursor-pointer items-start gap-2 border-b px-3 py-3 transition-colors duration-200 last:border-b-0",
              n.read_at ? "bg-white hover:bg-muted" : "bg-tint hover:bg-[hsl(207_44%_91%)]",
            )}
          >
            <span className={cx("mt-6 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} aria-label={n.read_at ? undefined : "Unread"} />
            <Link href={`/members/${n.actor.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0">
              <AvatarImg person={n.actor} size={56} />
            </Link>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-5">
                <span className="font-semibold">{n.actor.full_name || "A member"}</span> {TEXT[n.type]}.
              </p>
              {n.excerpt && <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{n.excerpt}</p>}
              {n.type === "connection_request" && n.link === "received" && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                  <ConnectButton otherId={n.actor.id} initial="received" signedIn onChange={() => read(n.id)} />
                </div>
              )}
            </div>
            <span className="shrink-0 pt-1 text-xs text-muted-foreground">{ago(n.created_at)}</span>
          </div>
        ))}
      </section>
    </>
  );
}
