import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, UsersRound } from "lucide-react";
import { fetchPosts, getViewer, PAGE_SIZE } from "@/lib/hub";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer, SubmitButton } from "@/components/hub-client";
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
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, is_private, created_by, group_members(count)")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();

  let isMember = false;
  if (userId) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", group.id)
      .eq("user_id", userId)
      .maybeSingle();
    isMember = !!membership;
  }
  const canSee = isMember || !group.is_private || viewer.isStaff;
  const posts = canSee ? await fetchPosts(supabase, userId, { groupId: group.id, page }) : [];
  const count = (group.group_members as unknown as { count: number }[])[0]?.count ?? 0;

  return (
    <>
      <section className="panel overflow-hidden">
        <div className="h-20" style={{ background: "linear-gradient(120deg, hsl(var(--ink)) 55%, hsl(var(--primary)) 160%)" }} />
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-5">
          <div className="min-w-0">
            <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-white ring-4 ring-white">
              <UsersRound className="h-6 w-6" />
            </span>
            <h1 className="mt-2 text-2xl font-bold">{group.name}</h1>
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {group.is_private && <Lock className="h-3 w-3" />}
              {group.is_private ? "Private group" : "Public group"}, {count} {count === 1 ? "member" : "members"}
            </p>
          </div>
          {!userId && !group.is_private && (
            <Link href="/auth/login" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
              Join group
            </Link>
          )}
          {userId && !isMember && !group.is_private && (
            <form action={joinGroup.bind(null, group.id)}>
              <SubmitButton>Join group</SubmitButton>
            </form>
          )}
          {isMember && group.created_by !== userId && (
            <form action={leaveGroup.bind(null, group.id)}>
              <SubmitButton tone="outline">Leave group</SubmitButton>
            </form>
          )}
        </div>
        {group.description && <p className="border-t px-5 py-4 text-sm leading-relaxed">{group.description}</p>}
      </section>

      {isMember && <Composer me={viewer.profile} groupId={group.id} placeholder={`Post to ${group.name}`} />}
      {!canSee && <Empty title="This group is private">Posts are visible to members. Joining is by invitation.</Empty>}
      {canSee && posts.length === 0 && (
        <Empty title="No posts in this group yet">{isMember ? "Start the first conversation." : "Join the group to start the conversation."}</Empty>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/groups/${slug}`} />
    </>
  );
}
