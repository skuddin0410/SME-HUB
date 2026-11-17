import Link from "next/link";
import { Heart, MessageCircle, UserCheck, UserPlus } from "lucide-react";
import { AUTHOR_FIELDS, requireUser, timeAgo, type Author } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { AvatarImg, SubmitButton } from "@/components/hub-client";
import { markNotificationsRead } from "@/app/(hub)/actions";

type Note = {
  id: string;
  type: "like" | "comment" | "connection_request" | "connection_accepted";
  post_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: Author;
};

const KIND = {
  like: { text: "liked your post", icon: Heart },
  comment: { text: "commented on your post", icon: MessageCircle },
  connection_request: { text: "wants to connect with you", icon: UserPlus },
  connection_accepted: { text: "accepted your connection request", icon: UserCheck },
};

export default async function NotificationsPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("notifications")
    .select(`id, type, post_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(${AUTHOR_FIELDS})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const notes = (data ?? []) as unknown as Note[];
  const href = (n: Note) =>
    n.post_id ? `/posts/${n.post_id}` : n.type === "connection_request" ? "/network" : `/members/${n.actor.id}`;

  return (
    <>
      <PageTitle title="Alerts">
        {notes.some((n) => !n.read_at) && (
          <form action={markNotificationsRead}>
            <SubmitButton tone="outline">Mark all as read</SubmitButton>
          </form>
        )}
      </PageTitle>
      {notes.length === 0 ? (
        <Empty title="No alerts yet">When someone likes, comments or connects, you will see it here.</Empty>
      ) : (
        <section className="panel divide-y overflow-hidden">
          {notes.map((n) => {
            const Icon = KIND[n.type].icon;
            return (
              <Link key={n.id} href={href(n)} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted ${n.read_at ? "" : "bg-primary/5"}`}>
                <span className="relative">
                  <AvatarImg person={n.actor} size={42} />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-white ring-2 ring-white">
                    <Icon className="h-3 w-3" />
                  </span>
                </span>
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{n.actor.full_name || "A member"}</span> {KIND[n.type].text}
                  <span className="block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </p>
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
              </Link>
            );
          })}
        </section>
      )}
    </>
  );
}
