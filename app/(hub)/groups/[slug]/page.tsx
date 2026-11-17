import { notFound } from "next/navigation";
import { fetchPosts, getMe, PAGE_SIZE } from "@/lib/hub";
import { Composer, Empty, Pager, PostCard } from "@/components/hub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { joinGroup, leaveGroup } from "@/app/(hub)/actions";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const page = Number((await searchParams).page) || 1;
  const { supabase, userId, profile } = await getMe();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, is_private, created_by, group_members(count)")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .maybeSingle();
  const isMember = !!membership;
  const canSee = isMember || !group.is_private || profile?.role !== "member";
  const posts = canSee ? await fetchPosts(supabase, userId, { groupId: group.id, page }) : [];
  const memberCount = (group.group_members as unknown as { count: number }[])[0]?.count ?? 0;

  return (
    <>
      <Card className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{group.name}</h1>
          <Badge variant="secondary">{group.is_private ? "Private" : "Public"}</Badge>
          <span className="text-xs text-muted-foreground">{memberCount} members</span>
        </div>
        {group.description && <p className="text-sm">{group.description}</p>}
        {isMember && group.created_by !== userId && (
          <form action={leaveGroup.bind(null, group.id)}>
            <Button type="submit" size="sm" variant="outline">
              Leave group
            </Button>
          </form>
        )}
        {!isMember && !group.is_private && (
          <form action={joinGroup.bind(null, group.id)}>
            <Button type="submit" size="sm">
              Join group
            </Button>
          </form>
        )}
        {!isMember && group.is_private && (
          <p className="text-sm text-muted-foreground">This group is private. Joining is by invitation.</p>
        )}
      </Card>

      {isMember && <Composer groupId={group.id} placeholder={`Post to ${group.name}`} />}
      {canSee && posts.length === 0 && <Empty>No posts in this group yet.</Empty>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} meId={userId} isStaff={profile?.role !== "member"} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/groups/${slug}`} />
    </>
  );
}
