import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getGroupSettings } from "@/lib/groups-server";
import { JOIN_MODES } from "@/lib/groups";
import { GroupCover, ManageGroupForm, MessageAllForm, RequestJoinForm } from "@/components/group-client";
import { AUTHOR_FIELDS, fetchPosts, getViewer, PAGE_SIZE, type Author } from "@/lib/hub";
import { InvitePanel } from "@/components/business-client";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer, GroupLogo, SubmitButton } from "@/components/hub-client";
import { joinGroup, leaveGroup, removeGroupInvite } from "@/app/(hub)/actions";
import { cancelJoinRequest, decideRequest, removeMember, setGroupArchived, setMemberRole } from "@/app/(hub)/group-actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("groups").select("name, description, is_private").eq("slug", slug).maybeSingle();
  if (!data) return { title: "Group not found" };
  return pageMeta({
    title: `${data.name} group`,
    description: data.description || `${data.name} is a group on SMB Hub, Canada's small business network.`,
    path: `/groups/${slug}`,
    index: !data.is_private,
  });
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const settings = await getGroupSettings();
  const viewer = await getViewer();
  const { supabase, userId } = viewer;

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, is_private, created_by, category, cover, rules, join_mode, status, group_members(count)")
    .eq("slug", slug)
    .maybeSingle();
  if (!group) notFound();

  let role: string | null = null;
  let invitedMe = false;
  let myRequest: string | null = null;
  let candidates: Author[] = [];
  let alreadyInvited: string[] = [];
  if (userId) {
    const [{ data: membership }, { data: invites }, { data: req }] = await Promise.all([
      supabase.from("group_members").select("role").eq("group_id", group.id).eq("user_id", userId).maybeSingle(),
      supabase.from("group_invites").select("user_id").eq("group_id", group.id),
      supabase.from("group_join_requests").select("status").eq("group_id", group.id).eq("user_id", userId).maybeSingle(),
    ]);
    role = (membership?.role as string | undefined) ?? null;
    invitedMe = (invites ?? []).some((i) => i.user_id === userId);
    myRequest = (req?.status as string | undefined) ?? null;
    if (role === "admin" && group.is_private) {
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
  const isMember = !!role;
  const isAdmin = role === "admin";
  const isMod = isAdmin || role === "moderator" || viewer.isStaff;
  const archived = group.status === "archived";
  const canSee = isMember || !group.is_private || viewer.isStaff;
  const tabs = [
    { key: "posts", label: "Posts" },
    { key: "members", label: "Members" },
    { key: "rules", label: "Rules" },
    ...(isMod || isAdmin ? [{ key: "manage", label: "Manage" }] : []),
  ];
  const tab = tabs.some((t) => t.key === sp.tab) ? sp.tab! : "posts";
  const count = (group.group_members as unknown as { count: number }[])[0]?.count ?? 0;

  const posts = canSee && tab === "posts" ? await fetchPosts(supabase, userId, { groupId: group.id, page }) : [];
  const members =
    canSee && (tab === "members" || tab === "manage")
      ? (((await supabase.from("group_members").select(`role, user_id, profile:profiles!group_members_user_id_fkey(${AUTHOR_FIELDS})`).eq("group_id", group.id).order("created_at")).data ?? []) as unknown as { role: string; user_id: string; profile: Author }[])
      : [];
  const requests =
    isMod && tab === "manage"
      ? (((await supabase.from("group_join_requests").select(`user_id, message, created_at, profile:profiles!group_join_requests_user_id_fkey(${AUTHOR_FIELDS})`).eq("group_id", group.id).eq("status", "pending").order("created_at")).data ?? []) as unknown as { user_id: string; message: string; profile: Author }[])
      : [];

  const tabLink = (key: string) => (key === "posts" ? `/groups/${slug}` : `/groups/${slug}?tab=${key}`);
  const joinLabel = group.join_mode === "invite" ? "By invitation" : "";

  return (
    <>
      <section className="panel overflow-hidden">
        <GroupCover cover={group.cover} className={settings.header === "top" ? "h-36" : "h-28"} />
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-5">
          <div className="min-w-0">
            <GroupLogo seed={slug} name={group.name} size={64} className="relative -mt-8 !rounded-xl ring-4 !ring-white" />
            <h1 className="mt-2 text-2xl font-bold">{group.name}</h1>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[0.875rem] text-muted-foreground">
              {group.is_private && settings.head.priv && <Lock className="h-3 w-3" />}
              {settings.head.priv && <span>{group.is_private ? "Private group" : "Public group"}</span>}
              {settings.head.type && <span>, {group.category}</span>}
              <span>
                , {count} {count === 1 ? "member" : "members"}
              </span>
              {archived && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">Archived</span>}
            </p>
          </div>
          {settings.head.act && !archived && (
            <div className="flex flex-col items-end gap-2">
              {!userId && group.join_mode === "open" && (
                <Link href="/auth/login" className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
                  Join group
                </Link>
              )}
              {userId && !isMember && group.join_mode === "open" && (
                <form action={joinGroup.bind(null, group.id)}>
                  <SubmitButton>Join group</SubmitButton>
                </form>
              )}
              {userId && !isMember && group.join_mode === "request" && !myRequest && <RequestJoinForm groupId={group.id} />}
              {userId && !isMember && myRequest === "pending" && (
                <form action={cancelJoinRequest.bind(null, group.id)} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Request sent</span>
                  <SubmitButton tone="ghost">Cancel request</SubmitButton>
                </form>
              )}
              {userId && !isMember && myRequest === "declined" && <p className="text-sm text-muted-foreground">Your request was not approved.</p>}
              {userId && !isMember && invitedMe && (
                <div className="flex gap-2">
                  <form action={removeGroupInvite.bind(null, group.id, userId)}>
                    <SubmitButton tone="ghost">Decline</SubmitButton>
                  </form>
                  <form action={joinGroup.bind(null, group.id)}>
                    <SubmitButton>Accept invitation</SubmitButton>
                  </form>
                </div>
              )}
              {userId && !isMember && !invitedMe && joinLabel && <p className="text-sm text-muted-foreground">{joinLabel}</p>}
              {isMember && group.created_by !== userId && (
                <form action={leaveGroup.bind(null, group.id)}>
                  <SubmitButton tone="outline">Leave group</SubmitButton>
                </form>
              )}
            </div>
          )}
        </div>
        {settings.head.desc && group.description && <p className="border-t px-5 py-4 text-sm leading-relaxed">{group.description}</p>}
        <nav aria-label="Group sections" className="flex gap-1 border-t px-3">
          {tabs.map((t) => (
            <Link key={t.key} href={tabLink(t.key)} aria-current={tab === t.key ? "page" : undefined} className={`px-3 py-3 text-sm font-semibold ${tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
      </section>

      {tab === "posts" && (
        <>
          {isAdmin && group.is_private && <InvitePanel groupId={group.id} candidates={candidates} invited={alreadyInvited} />}
          {isMember && !archived && <Composer me={viewer.profile} groupId={group.id} placeholder={`Post to ${group.name}`} />}
          {archived && <Empty title="This group is archived">Posts are kept for reading, but nobody can add new ones.</Empty>}
          {!canSee && (
            <Empty title="This group is private">
              {invitedMe ? "You have been invited. Accept the invitation to see the posts." : group.join_mode === "request" ? "Request to join and a moderator will let you in." : "Posts are visible to members. Joining is by invitation from a group admin."}
            </Empty>
          )}
          {canSee && posts.length === 0 && !archived && <Empty title="No posts in this group yet">{isMember ? "Start the first conversation." : "Join the group to start the conversation."}</Empty>}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewer={viewer} />
          ))}
          <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/groups/${slug}`} />
        </>
      )}

      {tab === "members" && (
        <section className="panel divide-y">
          {!canSee && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Members of a private group are visible to its members.</p>}
          {members.map((m) => (
            <Link key={m.user_id} href={`/members/${m.user_id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/50">
              <span className="font-semibold">{m.profile.full_name}</span>
              <span className="text-xs capitalize text-muted-foreground">{m.role === "admin" ? "Owner" : m.role}</span>
            </Link>
          ))}
        </section>
      )}

      {tab === "rules" && (
        <section className="panel p-5">
          <h2 className="text-base font-semibold">Group rules</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{group.rules || "This group has not set any rules yet."}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            {JOIN_MODES.find((m) => m.value === group.join_mode)?.label}
          </p>
        </section>
      )}

      {tab === "manage" && isMod && (
        <>
          {group.join_mode === "request" && (
            <section className="panel">
              <h2 className="px-4 py-3 text-base font-semibold">Join requests ({requests.length})</h2>
              {requests.length === 0 && <p className="border-t px-4 py-4 text-sm text-muted-foreground">No one is waiting.</p>}
              {requests.map((r) => (
                <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.profile.full_name}</p>
                    {r.message && <p className="text-muted-foreground">{r.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <form action={decideRequest.bind(null, group.id, r.user_id, false)}>
                      <SubmitButton tone="ghost">Decline</SubmitButton>
                    </form>
                    <form action={decideRequest.bind(null, group.id, r.user_id, true)}>
                      <SubmitButton>Approve</SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </section>
          )}
          <section className="panel">
            <h2 className="px-4 py-3 text-base font-semibold">Members</h2>
            {members.map((m) => (
              <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                <span>
                  <span className="font-semibold">{m.profile.full_name}</span> <span className="text-xs capitalize text-muted-foreground">{m.role === "admin" ? "Owner" : m.role}</span>
                </span>
                {m.role !== "admin" && (
                  <div className="flex gap-2">
                    {isAdmin && (
                      <form action={setMemberRole.bind(null, group.id, m.user_id, m.role === "moderator" ? "member" : "moderator")}>
                        <SubmitButton tone="outline" className="!px-3 !py-1.5">
                          {m.role === "moderator" ? "Remove moderator" : "Make moderator"}
                        </SubmitButton>
                      </form>
                    )}
                    {(isAdmin || m.role === "member") && (
                      <form action={removeMember.bind(null, group.id, m.user_id)}>
                        <SubmitButton tone="danger" className="!px-3 !py-1.5">
                          Remove
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
          {(isAdmin || viewer.isStaff) && (
            <section className="panel p-4">
              <h2 className="mb-3 text-base font-semibold">Group details</h2>
              <ManageGroupForm
                groupId={group.id}
                g={{ description: group.description, rules: group.rules ?? "", cover: group.cover, category: group.category, join_mode: group.join_mode }}
                types={settings.types}
                isAdmin={isAdmin || viewer.isStaff}
                isPrivate={group.is_private}
              />
            </section>
          )}
          {isAdmin && settings.msg_all && !archived && (
            <section className="panel p-4">
              <h2 className="mb-1 text-base font-semibold">Message all members</h2>
              <p className="mb-3 text-xs text-muted-foreground">Arrives as a direct message. Up to three a day.</p>
              <MessageAllForm groupId={group.id} />
            </section>
          )}
          {isAdmin && settings.archive && (
            <form action={setGroupArchived.bind(null, group.id, !archived)} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-muted-foreground">{archived ? "Bring this group back so members can post again." : "Archiving keeps the posts but stops new ones."}</p>
              <SubmitButton tone="outline">{archived ? "Restore group" : "Archive group"}</SubmitButton>
            </form>
          )}
        </>
      )}
    </>
  );
}
