import Link from "next/link";
import { getMe, timeAgo, type Author } from "@/lib/hub";
import { Avatar, Empty } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { markNotificationsRead } from "@/app/(hub)/actions";

type Note = {
  id: string;
  type: "like" | "comment" | "connection_request" | "connection_accepted";
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: Author;
};

const TEXT: Record<Note["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  connection_request: "wants to connect",
  connection_accepted: "accepted your connection request",
};

export default async function NotificationsPage() {
  const { supabase, userId } = await getMe();
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, type, post_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, full_name, headline, avatar_url, member_type)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const notes = (data ?? []) as unknown as Note[];
  const href = (n: Note) =>
    n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network" : `/members/${n.actor.id}`;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alerts</h1>
        {notes.some((n) => !n.read_at) && (
          <form action={markNotificationsRead}>
            <Button type="submit" size="sm" variant="outline">
              Mark all read
            </Button>
          </form>
        )}
      </div>
      {notes.length === 0 && <Empty>Nothing new yet.</Empty>}
      {notes.map((n) => (
        <Link key={n.id} href={href(n)}>
          <Card className={`flex items-center gap-3 p-4 ${n.read_at ? "" : "border-primary/50 bg-primary/5"}`}>
            <Avatar person={n.actor} size={36} />
            <p className="text-sm">
              <span className="font-semibold">{n.actor.full_name || "A member"}</span> {TEXT[n.type]}
              <span className="block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
            </p>
          </Card>
        </Link>
      ))}
    </>
  );
}
