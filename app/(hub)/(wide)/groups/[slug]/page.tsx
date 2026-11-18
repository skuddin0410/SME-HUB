import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { AUTHOR_FIELDS, fetchPosts, getViewer, PAGE_SIZE, type Author } from "@/lib/hub";
import { InvitePanel } from "@/components/business-client";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer, Cover, GroupLogo, SubmitButton } from "@/components/hub-client";
import { joinGroup, leaveGroup, removeGroupInvite } from "@/app/(hub)/actions";

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
  let isAdmin = false;
  let invitedMe = false;
  let candidates: Author[] = [];
  let alreadyInvited: string[] = [];
  if (userId) {
    const [{ data: membership }, { data: invites }] = await Promise.all([
      supabase.from("group_members").select("role").eq("group_id", group.id).eq("user_id", userId).maybeSingle(),
      supabase.from("group_invites").select("user_id").eq("group_id", group.id),
    ]);
    isMember = !!membership;
    isAdmin = membership?.role === "admin";
    invitedMe = (invites ?? []).some((i) => i.user_id === userId);
    if (isAdmin && group.is_private) {
      const [{ data: conns }, { data: members }] = await Promise.all([
        supabase
          .from("connections")
          .select(`requester_id, requester:profiles!connections_requester_id_fkey(${AUTHOR_FIELDS}), addressee:profiles!connections_addressee_id_fkey(${AUTHOR_FIELDS})`)
          .eq("status", "accepted"),
        supabase.from("group_members").select("user_id").eq("group_id", group.id),
      ]);
      const inGroup = new Set((members ?? []).map((m) => m.user_id as string));
      candidates = ((conns ?? []) as unknown as { requester_id: string; requester: Author; addressee: Author }[])
        .map((c) => (c.requester_id === userId ? c.addressee : c.requester))
        .filter((p) => !inGroup.has(p.id));
      alreadyInvited = (invites ?? []).map((i) => i.user_id as string);
    }
  }
  const canSee = isMember || !group.is_private || viewer.isStaff;
  const posts = canSee ? await fetchPosts(supabase, userId, { groupId: group.id, page }) : [];
  const count = (group.group_members as unknown as { count: number }[])[0]?.count ?? 0;

  return (
    <>
      <section className="panel overflow-hidden">
        <Cover seed={group.id} className="h-28" />
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-5">
          <div className="min-w-0">
            <GroupLogo seed={slug} name={group.name} size={64} className="relative -mt-8 !rounded-xl ring-4 !ring-white" />
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
          {userId && !isMember && group.is_private && invitedMe && (
            <div className="flex gap-2">
              <form action={removeGroupInvite.bind(null, group.id, userId)}>
                <SubmitButton tone="ghost">Decline</SubmitButton>
              </form>
              <form action={joinGroup.bind(null, group.id)}>
                <SubmitButton>Accept invitation</SubmitButton>
              </form>
            </div>
          )}
          {isMember && group.created_by !== userId && (
            <form action={leaveGroup.bind(null, group.id)}>
              <SubmitButton tone="outline">Leave group</SubmitButton>
            </form>
          )}
        </div>
        {group.description && <p className="border-t px-5 py-4 text-sm leading-relaxed">{group.description}</p>}
      </section>

      {isAdmin && group.is_private && <InvitePanel groupId={group.id} candidates={candidates} invited={alreadyInvited} />}
      {isMember && <Composer me={viewer.profile} groupId={group.id} placeholder={`Post to ${group.name}`} />}
      {!canSee && (
        <Empty title="This group is private">
          {invitedMe ? "You have been invited. Accept the invitation to see the posts." : "Posts are visible to members. Joining is by invitation from a group admin."}
        </Empty>
      )}
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
