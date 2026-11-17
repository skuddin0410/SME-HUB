import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AUTHOR_FIELDS, requireUser, timeAgo, type Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";
import { Thread, type Msg } from "@/components/messages-client";

type Row = Msg & { recipient_id: string; read_at: string | null; sender: Author; recipient: Author };
type Conn = { requester_id: string; requester: Author; addressee: Author };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ with?: string; text?: string }> }) {
  const { with: withParam, text = "" } = await searchParams;
  const otherId = withParam && /^[0-9a-f-]{36}$/i.test(withParam) ? withParam : null;
  const { supabase, userId } = await requireUser();

  // opening a conversation marks what they sent me as read
  if (otherId) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", userId)
      .eq("sender_id", otherId)
      .is("read_at", null);
  }

  const [recent, conns] = await Promise.all([
    supabase
      .from("messages")
      .select(
        `id, sender_id, recipient_id, body, created_at, read_at, sender:profiles!messages_sender_id_fkey(${AUTHOR_FIELDS}), recipient:profiles!messages_recipient_id_fkey(${AUTHOR_FIELDS})`,
      )
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("connections")
      .select(
        `requester_id, requester:profiles!connections_requester_id_fkey(${AUTHOR_FIELDS}), addressee:profiles!connections_addressee_id_fkey(${AUTHOR_FIELDS})`,
      )
      .eq("status", "accepted"),
  ]);
  const rows = (recent.data ?? []) as unknown as Row[];
  const connections = ((conns.data ?? []) as unknown as Conn[]).map((c) => (c.requester_id === userId ? c.addressee : c.requester));

  // one entry per person, newest message first
  const threads = new Map<string, { person: Author; last: Row; unread: number }>();
  for (const r of rows) {
    const person = r.sender_id === userId ? r.recipient : r.sender;
    const t = threads.get(person.id) ?? { person, last: r, unread: 0 };
    if (r.recipient_id === userId && !r.read_at) t.unread++;
    threads.set(person.id, t);
  }
  const list = [...threads.values()];
  const fresh = connections.filter((c) => !threads.has(c.id));
  const other = otherId ? (threads.get(otherId)?.person ?? connections.find((c) => c.id === otherId) ?? null) : null;
  const history = other
    ? rows.filter((r) => r.sender_id === other.id || r.recipient_id === other.id).reverse()
    : [];
  const link = (id: string) => `/messages?with=${id}${text ? `&text=${encodeURIComponent(text)}` : ""}`;

  return (
    <div className="panel grid h-[calc(100vh-150px)] min-h-[460px] overflow-hidden md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className={`flex-col border-r ${other ? "hidden md:flex" : "flex"}`}>
        <h1 className="border-b px-4 py-3 text-base font-semibold">Messaging</h1>
        <div className="flex-1 overflow-y-auto">
          {text && !other && <p className="bg-primary/5 px-4 py-2 text-xs text-primary">Choose who to send this post to.</p>}
          {list.map(({ person, last, unread }) => (
            <Link
              key={person.id}
              href={link(person.id)}
              className={`flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted ${person.id === otherId ? "border-l-4 border-l-primary bg-primary/5" : ""}`}
            >
              <AvatarImg person={person} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{person.full_name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(last.created_at)}</span>
                </span>
                <span className={`block truncate text-xs ${unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {last.sender_id === userId ? "You: " : ""}
                  {last.body}
                </span>
              </span>
              {unread > 0 && <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold leading-4 text-white">{unread}</span>}
            </Link>
          ))}
          {fresh.length > 0 && <p className="px-4 pb-1 pt-3 text-xs font-semibold text-muted-foreground">Start a conversation</p>}
          {fresh.map((person) => (
            <Link key={person.id} href={link(person.id)} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-muted">
              <AvatarImg person={person} size={36} />
              <span className="truncate text-sm font-semibold">{person.full_name}</span>
            </Link>
          ))}
          {list.length === 0 && fresh.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Messages are between connections.{" "}
              <Link href="/members" className="font-semibold text-primary hover:underline">
                Find members to connect with
              </Link>
              .
            </p>
          )}
        </div>
      </aside>

      <section className={`min-h-0 flex-col ${other ? "flex" : "hidden md:flex"}`}>
        {other ? (
          <>
            <header className="flex items-center gap-3 border-b px-4 py-2.5">
              <Link href="/messages" className="rounded-full p-1.5 hover:bg-muted md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <AvatarImg person={other} size={36} />
              <Link href={`/members/${other.id}`} className="min-w-0">
                <span className="block truncate text-sm font-semibold hover:underline">{other.full_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{other.headline}</span>
              </Link>
            </header>
            <Thread key={other.id} meId={userId} otherId={other.id} initial={history} prefill={text} />
          </>
        ) : (
          <p className="m-auto max-w-xs px-6 text-center text-sm text-muted-foreground">
            {otherId ? "You can only message members you are connected with." : "Pick a conversation, or start one with a connection."}
          </p>
        )}
      </section>
    </div>
  );
}
