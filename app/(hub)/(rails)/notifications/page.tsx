import { AUTHOR_FIELDS, getLinks, requireUser, type Author } from "@/lib/hub";
import { NotificationsList, type Note } from "@/components/notifications-client";

type Row = Omit<Note, "excerpt" | "link"> & { actor: Author; post: { body: string } | null };

export default async function NotificationsPage() {
  const { supabase, userId } = await requireUser();
  const [{ data }, links] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        `id, type, post_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(${AUTHOR_FIELDS}), post:posts!notifications_post_id_fkey(body)`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60),
    getLinks(),
  ]);
  const notes: Note[] = ((data ?? []) as unknown as Row[]).map(({ post, ...n }) => ({
    ...n,
    excerpt: post?.body ?? null,
    link: links.get(n.actor.id) ?? "none",
  }));

  return <NotificationsList initial={notes} />;
}
