/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MEMBER_TYPES, timeAgo, type Author, type Post, type Profile } from "@/lib/hub";
import { createPost, deletePost, toggleLike } from "@/app/(hub)/actions";
import { Heart, MessageCircle, Trash2, Flag } from "lucide-react";

export const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Avatar({ person, size = 40 }: { person: Pick<Profile, "full_name" | "avatar_url">; size?: number }) {
  const style = { width: size, height: size };
  return person.avatar_url ? (
    <img src={person.avatar_url} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
    >
      {(person.full_name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export function PersonLine({ person, extra }: { person: Author; extra?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href={`/members/${person.id}`}>
        <Avatar person={person} />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/members/${person.id}`} className="truncate font-semibold hover:underline">
            {person.full_name || "Member"}
          </Link>
          {person.member_type !== "owner" && <Badge variant="secondary">{MEMBER_TYPES[person.member_type]}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{extra ?? person.headline}</p>
      </div>
    </div>
  );
}

export function Composer({ groupId, placeholder }: { groupId?: string; placeholder?: string }) {
  return (
    <Card className="p-4">
      <form action={createPost} className="flex flex-col gap-3">
        {groupId && <input type="hidden" name="group_id" value={groupId} />}
        <textarea
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder={placeholder ?? "Share an update, a question or a win with the community"}
          className={fieldClass}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input type="file" name="image" accept="image/*" className="max-w-[220px] text-xs" />
            {!groupId && (
              <select name="visibility" defaultValue="public" className="rounded-md border bg-background px-2 py-1">
                <option value="public">Public</option>
                <option value="members">All members</option>
                <option value="connections">My connections</option>
                <option value="private">Only me</option>
              </select>
            )}
          </div>
          <Button type="submit" size="sm">
            Post
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PostCard({ post, meId, isStaff }: { post: Post; meId: string; isStaff?: boolean }) {
  const where = post.group ? (
    <>
      {timeAgo(post.created_at)} in{" "}
      <Link href={`/groups/${post.group.slug}`} className="hover:underline">
        {post.group.name}
      </Link>
    </>
  ) : (
    `${timeAgo(post.created_at)}${post.visibility === "public" ? "" : ` · ${post.visibility}`}`
  );
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <PersonLine person={post.author} extra={where} />
        {(post.author.id === meId || isStaff) && (
          <form action={deletePost.bind(null, post.id)}>
            <Button type="submit" variant="ghost" size="icon" title="Delete post">
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
      {post.image_url && <img src={post.image_url} alt="" className="max-h-[480px] w-full rounded-md object-cover" />}
      <div className="flex items-center gap-1 border-t pt-2 text-sm">
        <form action={toggleLike.bind(null, post.id, post.likedByMe)}>
          <Button type="submit" variant="ghost" size="sm" className="gap-1.5">
            <Heart className={`h-4 w-4 ${post.likedByMe ? "fill-red-500 text-red-500" : ""}`} />
            {post.likes}
          </Button>
        </form>
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/posts/${post.id}`}>
            <MessageCircle className="h-4 w-4" />
            {post.comments}
          </Link>
        </Button>
        {post.author.id !== meId && (
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5 text-muted-foreground">
            <Link href={`/posts/${post.id}?report=1`}>
              <Flag className="h-4 w-4" />
              Report
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}

export function Pager({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  if (page === 1 && !hasMore) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="flex justify-between">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}${sep}page=${page - 1}`}>Newer</Link>
        </Button>
      ) : (
        <span />
      )}
      {hasMore && (
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}${sep}page=${page + 1}`}>Older</Link>
        </Button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="p-8 text-center text-sm text-muted-foreground">{children}</Card>;
}
