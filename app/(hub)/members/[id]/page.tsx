import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchPosts, getMe, MEMBER_TYPES, PAGE_SIZE, type Profile } from "@/lib/hub";
import { Avatar, Empty, Pager, PostCard } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  acceptConnection,
  blockMember,
  removeConnection,
  requestConnection,
  setMemberStatus,
} from "@/app/(hub)/actions";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = Number((await searchParams).page) || 1;
  const { supabase, userId, profile: me } = await getMe();
  const isStaff = me?.role !== "member";

  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  const member = data as Profile | null;
  if (!member) notFound();
  const isMe = id === userId;

  const [{ data: link }, { count: connectionCount }, posts] = await Promise.all([
    supabase
      .from("connections")
      .select("requester_id, status")
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${userId})`)
      .maybeSingle(),
    isMe
      ? supabase
          .from("connections")
          .select("requester_id", { count: "exact", head: true })
          .eq("status", "accepted")
      : Promise.resolve({ count: null }),
    fetchPosts(supabase, userId, { authorId: id, page }),
  ]);

  return (
    <>
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-4">
          <Avatar person={member} size={80} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{member.full_name || "Member"}</h1>
              <Badge variant="secondary">{MEMBER_TYPES[member.member_type]}</Badge>
              {member.status === "suspended" && <Badge variant="destructive">Suspended</Badge>}
            </div>
            {member.headline && <p className="text-sm">{member.headline}</p>}
            <p className="text-xs text-muted-foreground">
              {[member.location, `Joined ${new Date(member.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short" })}`]
                .filter(Boolean)
                .join(" · ")}
              {isMe && connectionCount !== null ? ` · ${connectionCount} connections` : ""}
            </p>
            {member.website && (
              <a
                href={member.website.startsWith("http") ? member.website : `https://${member.website}`}
                target="_blank"
                rel="noreferrer nofollow"
                className="text-xs text-primary underline"
              >
                {member.website}
              </a>
            )}
          </div>
        </div>
        {member.bio && <p className="whitespace-pre-wrap text-sm">{member.bio}</p>}

        <div className="flex flex-wrap gap-2">
          {isMe && (
            <Button asChild size="sm" variant="outline">
              <Link href="/profile/edit">Edit profile</Link>
            </Button>
          )}
          {!isMe && !link && (
            <form action={requestConnection.bind(null, id)}>
              <Button type="submit" size="sm">
                Connect
              </Button>
            </form>
          )}
          {!isMe && link?.status === "pending" && link.requester_id === id && (
            <form action={acceptConnection.bind(null, id)}>
              <Button type="submit" size="sm">
                Accept request
              </Button>
            </form>
          )}
          {!isMe && link && (
            <form action={removeConnection.bind(null, id)}>
              <Button type="submit" size="sm" variant="outline">
                {link.status === "accepted"
                  ? "Remove connection"
                  : link.requester_id === userId
                    ? "Cancel request"
                    : "Decline"}
              </Button>
            </form>
          )}
          {!isMe && (
            <form action={blockMember.bind(null, id)}>
              <Button type="submit" size="sm" variant="ghost" className="text-muted-foreground">
                Block
              </Button>
            </form>
          )}
          {!isMe && isStaff && (
            <form action={setMemberStatus.bind(null, id, member.status === "active" ? "suspended" : "active")}>
              <Button type="submit" size="sm" variant="destructive">
                {member.status === "active" ? "Suspend member" : "Reinstate member"}
              </Button>
            </form>
          )}
        </div>
      </Card>

      {posts.length === 0 && <Empty>No posts to show.</Empty>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} meId={userId} isStaff={isStaff} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/members/${id}`} />
    </>
  );
}
