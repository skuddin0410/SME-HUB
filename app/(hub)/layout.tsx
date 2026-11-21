import Link from "next/link";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { CONTACT, EVENTS } from "@/lib/site";
import { Logo, SiteNav, type NavNote } from "@/components/site-nav";
import { HideOn } from "@/components/hide-on";
import { MessagingDock, type DockThread } from "@/components/messaging-dock";

export const dynamic = "force-dynamic";

const FOOTER_LINKS = [
  ["Home", "/feed"],
  ["About us", "/about"],
  ["Members", "/members"],
  ["Groups", "/groups"],
  ["Membership plans", "/membership-plans"],
  ["Help", "/help"],
  ["Community guidelines", "/policies/community-guidelines"],
  ["Discrimination policy", "/policies/discrimination-policy"],
  ["Terms and conditions", "/policies/terms"],
];

const NOTE_TEXT = {
  like: "reacted to your post.",
  comment: "commented on your post.",
  connection_request: "invited you to connect.",
  connection_accepted: "accepted your invitation.",
} as const;

function shortAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 604800)}w ago`;
}

/** Shell shared by every hub page: top navigation, footer, mobile tab bar. */
export default async function HubShell({ children }: { children: React.ReactNode }) {
  const { supabase, userId, profile, isStaff } = await getViewer();

  const none = Promise.resolve({ count: 0 });
  const [unread, requests, inbox, latest, recentMsgs] = await Promise.all([
    userId
      ? supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null)
      : none,
    userId
      ? supabase
          .from("connections")
          .select("requester_id", { count: "exact", head: true })
          .eq("addressee_id", userId)
          .eq("status", "pending")
      : none,
    userId
      ? supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", userId).is("read_at", null)
      : none,
    userId
      ? supabase
          .from("notifications")
          .select(`id, type, post_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(${AUTHOR_FIELDS})`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase
          .from("messages")
          .select(
            `id, sender_id, recipient_id, body, created_at, read_at, sender:profiles!messages_sender_id_fkey(${AUTHOR_FIELDS}), recipient:profiles!messages_recipient_id_fkey(${AUTHOR_FIELDS})`,
          )
          .order("created_at", { ascending: false })
          .limit(60)
      : Promise.resolve({ data: [] }),
  ]);

  // one row per conversation for the messaging pop-up, newest first
  type MsgRow = { sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; sender: Author; recipient: Author };
  const threadMap = new Map<string, DockThread>();
  for (const m of (recentMsgs.data ?? []) as unknown as MsgRow[]) {
    const other = m.sender_id === userId ? m.recipient : m.sender;
    if (!other) continue;
    const t = threadMap.get(other.id) ?? { id: other.id, name: other.full_name, avatar_url: other.avatar_url, last: m.body, ago: shortAgo(m.created_at), unread: 0 };
    if (m.recipient_id === userId && !m.read_at) t.unread += 1;
    threadMap.set(other.id, t);
  }
  const threads = [...threadMap.values()].slice(0, 8);

  type NoteRow = { id: string; type: keyof typeof NOTE_TEXT; post_id: string | null; read_at: string | null; created_at: string; actor: Author };
  const notes: NavNote[] = ((latest.data ?? []) as unknown as NoteRow[]).map((n) => ({
    id: n.id,
    actor: n.actor?.full_name || "A member",
    text: NOTE_TEXT[n.type] ?? "sent you an update",
    href: n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network" : `/members/${n.actor?.id}`,
    ago: shortAgo(n.created_at),
    unread: !n.read_at,
  }));

  return (
    <div className="min-h-screen">
      <SiteNav
        me={profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, headline: profile.headline } : null}
        isStaff={isStaff}
        requests={requests.count ?? 0}
        messages={inbox.count ?? 0}
        unread={unread.count ?? 0}
        notes={notes}
      />

      {profile?.status === "suspended" && (
        <p className="bg-rose-600 px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or comment.
        </p>
      )}

      {children}

      {/* the feed carries its own small footer in the right rail */}
      <HideOn paths={["/feed"]}>
      <footer className="mt-8 border-t border-[#E5E5E8] bg-white">
        <div className="mx-auto grid max-w-[1360px] gap-8 px-4 sm:px-6 lg:px-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              A place for small business owners and entrepreneurs to connect and trade experience, tools and advice, from
              financing to expansion.
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Explore</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {FOOTER_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="hover:text-primary hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">CanadianSME Events</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {EVENTS.map((e) => (
                <li key={e.href}>
                  <a href={e.href} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">
                    {e.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Contact</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{CONTACT.address}</li>
              {CONTACT.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-primary hover:underline">
                    {p}
                  </a>
                </li>
              ))}
              {CONTACT.emails.map((e) => (
                <li key={e}>
                  <a href={`mailto:${e}`} className="hover:text-primary hover:underline">
                    {e}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          All rights reserved. © {new Date().getFullYear()} Cmarketing Inc.
        </p>
      </footer>
      </HideOn>

      {profile && userId && <MessagingDock me={{ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url }} threads={threads} unread={inbox.count ?? 0} />}
    </div>
  );
}
