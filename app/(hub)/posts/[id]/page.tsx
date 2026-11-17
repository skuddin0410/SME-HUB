import { notFound } from "next/navigation";
import { fetchPosts, getMe, timeAgo, type Author } from "@/lib/hub";
import { fieldClass, PersonLine, PostCard } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { addComment, deleteComment, reportPost } from "@/app/(hub)/actions";

type Comment = { id: string; body: string; created_at: string; author: Author };

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string; reported?: string }>;
}) {
  const { id } = await params;
  const { report, reported } = await searchParams;
  const { supabase, userId, profile } = await getMe();
  const [post] = await fetchPosts(supabase, userId, { postId: id });
  if (!post) notFound();
  const isStaff = profile?.role !== "member";

  const { data } = await supabase
    .from("comments")
    .select("id, body, created_at, author:profiles!comments_author_id_fkey(id, full_name, headline, avatar_url, member_type)")
    .eq("post_id", id)
    .order("created_at");
  const comments = (data ?? []) as unknown as Comment[];

  return (
    <>
      <PostCard post={post} meId={userId} isStaff={isStaff} />

      {reported && <Card className="p-4 text-sm">Thanks. Our moderators will review this post.</Card>}
      {report && !reported && (
        <Card className="p-4">
          <form action={reportPost.bind(null, id)} className="flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="reason" className="font-semibold">
              Report this post as
            </label>
            <select id="reason" name="reason" className="rounded-md border bg-background px-2 py-1">
              <option value="spam">Spam or suspicious</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate">Inappropriate</option>
              <option value="misinformation">Misinformation</option>
              <option value="other">Other</option>
            </select>
            <Button type="submit" size="sm" variant="destructive">
              Send report
            </Button>
          </form>
        </Card>
      )}

      <Card className="flex flex-col gap-4 p-4">
        <form action={addComment.bind(null, id)} className="flex gap-2">
          <input name="body" required maxLength={2000} placeholder="Write a comment" className={fieldClass} />
          <Button type="submit" size="sm">
            Comment
          </Button>
        </form>
        {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} className="flex flex-col gap-1 border-t pt-3">
            <div className="flex items-start justify-between gap-2">
              <PersonLine person={c.author} extra={timeAgo(c.created_at)} />
              {(c.author.id === userId || isStaff) && (
                <form action={deleteComment.bind(null, c.id, id)}>
                  <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
                    Delete
                  </Button>
                </form>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words pl-[52px] text-sm">{c.body}</p>
          </div>
        ))}
      </Card>
    </>
  );
}
