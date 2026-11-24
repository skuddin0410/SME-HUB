import Link from "next/link";
import { AUTHOR_FIELDS, getViewer, type Author } from "@/lib/hub";
import { CONTACT, EVENTS } from "@/lib/site";
import type { NavNote } from "@/components/site-nav";
import { ZipHeader } from "@/components/zip/header";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/profile-completion.css";
import { HideOn } from "@/components/hide-on";
import { MessagingDock, type DockThread } from "@/components/messaging-dock";
import { ReadyProvider } from "@/components/ready/provider";
import { getMyReady } from "@/lib/ready";

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

  // profile completion: the member's five checks, and whether the AI set-up should open by itself (a new member, not ready, no draft yet)
  const ready = await getMyReady();
  let signupSite = "";
  let autoOpen = false;
  if (ready && profile && ready.count < 5 && Date.now() - new Date(profile.created_at).getTime() < 30 * 86_400_000) {
    const [claims, drafts] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.from("profile_drafts").select("id", { count: "exact", head: true }).eq("member_id", userId!),
    ]);
    signupSite = String((claims.data?.claims?.user_metadata as { website?: string } | undefined)?.website ?? "").slice(0, 300);
    autoOpen = (drafts.count ?? 0) === 0;
  }

  type NoteRow = { id: string; type: keyof typeof NOTE_TEXT; post_id: string | null; read_at: string | null; created_at: string; actor: Author };
  const notes: NavNote[] = ((latest.data ?? []) as unknown as NoteRow[]).map((n) => ({
    id: n.id,
    actor: n.actor?.full_name || "A member",
    text: NOTE_TEXT[n.type] ?? "sent you an update",
    href: n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network/connections" : `/members/${n.actor?.id}`,
    ago: shortAgo(n.created_at),
    unread: !n.read_at,
  }));

  const shell = (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        Skip to content
      </a>
      <div className="zip" style={{ display: "contents" }}>
      <ZipHeader
        me={profile ? { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url, headline: profile.headline } : null}
        isStaff={isStaff}
        requests={requests.count ?? 0}
        messages={inbox.count ?? 0}
        unread={unread.count ?? 0}
        notes={notes}
      />
      </div>

      {profile?.status === "suspended" && (
        <p className="bg-rose-600 px-3 py-2 text-center text-sm text-white">
          Your account is suspended. You can browse, but you cannot post or comment.
        </p>
      )}

      <div id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </div>

      <HideOn paths={["/feed"]}>
        <div className="zip" style={{ display: "contents" }}>
        <footer className="big">
          <div className="wrap">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="on-light" src="/brand/zip-logo.webp" alt="SMB Hub" width={117} height={30} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="on-dark" src="/brand/smb-hub-logo-on-dark.png" alt="SMB Hub" width={117} height={30} />
              <span>A place for small business owners and entrepreneurs to connect and trade experience, tools and advice, from financing to expansion.</span>
            </div>
            <div>
              <h3>Explore</h3>
              {FOOTER_LINKS.map(([label, href]) => (
                <Link key={href} href={href}>
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <h3>CanadianSME Events</h3>
              {EVENTS.map((e) => (
                <a key={e.href} href={e.href} target="_blank" rel="noreferrer">
                  {e.label}
                </a>
              ))}
            </div>
            <div>
              <h3>Contact</h3>
              <span>{CONTACT.address}</span>
              {CONTACT.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/\s/g, "")}`}>
                  {p}
                </a>
              ))}
              {CONTACT.emails.map((e) => (
                <a key={e} href={`mailto:${e}`}>
                  {e}
                </a>
              ))}
            </div>
          </div>
        </footer>
        <div className="copy">All rights reserved. © {new Date().getFullYear()} Cmarketing Inc.</div>
        </div>
      </HideOn>

      {profile && userId && <div aria-hidden className="hidden h-12 md:block" />}
      {profile && userId && <MessagingDock me={{ id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url }} threads={threads} unread={inbox.count ?? 0} />}
    </div>
  );
  return ready ? <ReadyProvider me={ready} website={signupSite} autoOpen={autoOpen}>{shell}</ReadyProvider> : shell;
}
