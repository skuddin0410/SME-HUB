import { AUTHOR_FIELDS, requireUser, type Author } from "@/lib/hub";
import { MessagingApp, type Msg } from "@/components/messages-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = { title: "Messaging", robots: { index: false } };

type Conn = { requester_id: string; requester: Author; addressee: Author };
type Row = Msg & { sender: Author; recipient: Author };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string; text?: string }> }) {
  const { with: withParam, text = "" } = await searchParams;
  const { supabase, userId, profile } = await requireUser();

  const [recent, conns] = await Promise.all([
    supabase
      .from("messages")
      .select(
        `id, sender_id, recipient_id, body, created_at, read_at, sender:profiles!messages_sender_id_fkey(${AUTHOR_FIELDS}), recipient:profiles!messages_recipient_id_fkey(${AUTHOR_FIELDS})`,
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("connections")
      .select(
        `requester_id, requester:profiles!connections_requester_id_fkey(${AUTHOR_FIELDS}), addressee:profiles!connections_addressee_id_fkey(${AUTHOR_FIELDS})`,
      )
      .eq("status", "accepted"),
  ]);
  const rows = (recent.data ?? []) as unknown as Row[];

  // everyone the viewer can talk to: current connections plus anyone already in the inbox
  const people = new Map<string, Author>();
  for (const c of (conns.data ?? []) as unknown as Conn[]) {
    const other = c.requester_id === userId ? c.addressee : c.requester;
    people.set(other.id, other);
  }
  for (const r of rows) {
    const other = r.sender_id === userId ? r.recipient : r.sender;
    if (other && !people.has(other.id)) people.set(other.id, other);
  }
  const messages: Msg[] = rows.map(({ id, sender_id, recipient_id, body, created_at, read_at }) => ({ id, sender_id, recipient_id, body, created_at, read_at }));
  const startWith = withParam && people.has(withParam) ? withParam : null;
  const me: Author = {
    id: userId,
    full_name: profile?.full_name ?? "You",
    headline: profile?.headline ?? "",
    avatar_url: profile?.avatar_url ?? null,
    member_type: profile?.member_type ?? "owner",
  };

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <h1>Messages</h1>
          <p className="muted">Private conversations with members you are connected to.</p>
        </div>
        <MessagingApp me={me} people={[...people.values()]} initialMessages={messages} startWith={startWith} prefill={text} />
      </div>
    </div>
  );
}
