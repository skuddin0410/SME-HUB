import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupSettings } from "@/lib/groups-server";
import { JOIN_MODES } from "@/lib/groups";
import { ManageGroupForm, MessageAllForm, RequestJoinForm } from "@/components/group-client";
import { Ic } from "@/components/zip/ic";
import { Scene } from "@/components/zip/scene";
import { ZipAv } from "@/components/zip/bits";
import { JoinBtn } from "@/components/zip/groups-client";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import { AUTHOR_FIELDS, fetchPosts, getViewer, PAGE_SIZE, type Author } from "@/lib/hub";
import { InvitePanel } from "@/components/business-client";
import { Empty, Pager, PostCard } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { PostBox } from "@/components/zip/post-box";
import { getTagRules } from "@/lib/zip/hashtags-server";
import { getComposerRules } from "@/lib/zip/settings-load";
import { joinGroup, leaveGroup, removeGroupInvite } from "@/app/(hub)/actions";
import { cancelJoinRequest, decideRequest, removeMember, setGroupArchived, setMemberRole } from "@/app/(hub)/group-actions";

/** Update 10: hashtag suggestions in the post window follow the team's hashtag rules. */
async function postTagRules() {
  const tr = await getTagRules();
  return tr.on ? { per: tr.per, min: tr.min, max: tr.max, blocked: tr.blocked, removed: tr.removed, merge: tr.merge } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await getViewer();
  const { data } = await supabase.from("groups").select("name, description, is_private").eq("slug", slug).maybeSingle();
  if (!data) return { title: "Group not found" };
  return pageMeta({
    title: `${data.name} group`,
    description: data.description || `${data.name} is a group on SME Hub, Canada's small business network.`,
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

  const [{ data: hostRow }, { data: preview }, { data: extra }, { data: related }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, headline, avatar_url").eq("id", group.created_by).maybeSingle(),
    canSee ? supabase.from("group_members").select("user_id, profile:profiles!group_members_user_id_fkey(id, full_name, location, avatar_url)").eq("group_id", group.id).order("created_at").limit(5) : Promise.resolve({ data: [] }),
    supabase.rpc("group_card_extras", { p_ids: [group.id] }),
    supabase.from("groups").select("id, slug, name, cover, is_private, join_mode, created_by").eq("status", "active").eq("category", group.category).eq("is_private", false).neq("id", group.id).limit(3),
  ]);
  const postsWeek = ((extra ?? []) as { posts_week: number }[])[0]?.posts_week ?? 0;
  const faces = ((preview ?? []) as unknown as { user_id: string; profile: { id: string; full_name: string | null; location: string | null; avatar_url: string | null } }[]).map((m) => m.profile).filter(Boolean);
  const relList = (related ?? []) as { id: string; slug: string; name: string; cover: string; is_private: boolean; join_mode: string; created_by: string }[];
  const relMine = userId && relList.length ? new Set(((await supabase.from("group_members").select("group_id").eq("user_id", userId).in("group_id", relList.map((r) => r.id))).data ?? []).map((m) => m.group_id as string)) : new Set<string>();

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
  const H = settings.head;
  const hostFirst = (hostRow?.full_name ?? "").split(" ")[0];
  const simpleJoin = isMember || group.join_mode === "open";
  const headerClass = settings.header === "top" ? "wide" : "";

  const actions = (
    <div className="row" style={{ flexWrap: "wrap" }}>
      {!archived && simpleJoin && <JoinBtn groupId={group.id} slug={slug} mode={group.join_mode} priv={group.is_private} joined={isMember} host={group.created_by === userId} requested={false} signedIn={!!userId} />}
      {!archived && userId && !isMember && group.join_mode === "request" && !myRequest && !invitedMe && <RequestJoinForm groupId={group.id} />}
      {!archived && !userId && group.join_mode !== "open" && <Link href="/auth/login" className="btn sm">Sign in to join</Link>}
      {!archived && userId && !isMember && group.join_mode === "request" && myRequest === "pending" && (
        <form action={cancelJoinRequest.bind(null, group.id)} className="row"><span className="muted small">Request sent</span><SubmitButton tone="ghost">Cancel request</SubmitButton></form>
      )}
      {!archived && userId && !isMember && myRequest === "declined" && <span className="muted small">Your request was not approved.</span>}
      {!archived && userId && !isMember && invitedMe && (
        <>
          <form action={removeGroupInvite.bind(null, group.id, userId)}><SubmitButton tone="ghost">Decline</SubmitButton></form>
          <form action={joinGroup.bind(null, group.id)}><SubmitButton>Accept invitation</SubmitButton></form>
        </>
      )}
      {userId && !isMember && !invitedMe && joinLabel && <span className="muted small">{joinLabel}</span>}
      {isAdmin && settings.msg_all && !archived && <Link href={tabLink("manage")} className="btn sm"><Ic n="mail" s={14} />Message all members</Link>}
    </div>
  );

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <p style={{ marginBottom: 12 }}><Link href="/groups" className="btn sm ghost">← All groups</Link></p>
        <div className={`card ghero ${headerClass}`}>
          <div className="gcover"><Scene n={group.cover} h={180} /></div>
          <div className="ginfo">
            <div className="stack grow" style={{ flexBasis: 340, gap: 6 }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                {H.type && <span className="tag">{group.category}</span>}
                {H.priv && <span className="tag" style={group.is_private ? { display: "inline-flex", gap: 4, alignItems: "center" } : undefined}>{group.is_private && <Ic n="lock" s={11} />}{group.is_private ? "Private group" : "Public group"}</span>}
                {archived && <span className="tag">Archived</span>}
              </div>
              <h1 style={{ font: "800 26px var(--display)" }}>{group.name}</h1>
              {H.desc && group.description && <p className="muted">{group.description}</p>}
              <div className="gstat">
                {H.faces && <><span className="faces">{faces.map((f) => <ZipAv key={f.id} name={f.full_name || "M"} src={f.avatar_url} size="s" />)}</span><span><b style={{ color: "var(--ink)" }}>{count}</b> {count === 1 ? "member" : "members"}</span></>}
                {H.act && <span>{H.faces ? "· " : ""}<span className="live" />{postsWeek} posts this week</span>}
              </div>
            </div>
            {actions}
          </div>
        </div>

        {!canSee ? (
          <div className="card" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", alignItems: "center", padding: 36 }}>
            <span className="sq big"><Ic n="lock" s={22} /></span>
            <h2 style={{ fontSize: 18 }}>This is a private group</h2>
            <p className="muted">
              Only members can see posts and the member list.{" "}
              {invitedMe ? "You have been invited. Accept the invitation above to join." : group.join_mode === "request" ? "Ask to join and the host will review your request." : "The host invites members directly."}
            </p>
            {hostRow && userId && <Link href={`/messages?to=${hostRow.id}`} className="btn sm ghost">Message the host</Link>}
          </div>
        ) : (
          <div className="cols">
            <section className="mid">
              <nav aria-label="Group sections" className="chips" style={{ marginBottom: 2 }}>
                {tabs.map((t) => <Link key={t.key} href={tabLink(t.key)} className="chip" aria-current={tab === t.key ? "page" : undefined}>{t.label}</Link>)}
              </nav>
              {tab === "posts" && (
                <>
                  {isAdmin && group.is_private && <InvitePanel groupId={group.id} candidates={candidates} invited={alreadyInvited} />}
                  {isMember && !archived && viewer.profile && (
                    <PostBox me={viewer.profile} groupId={group.id} rules={await getComposerRules()} staff={viewer.isStaff} tagRules={await postTagRules()}
                      free={!viewer.isStaff && !["plus", "advisor"].includes(String((viewer.profile as { plan?: string }).plan))} />
                  )}
                  {archived && <Empty title="This group is archived">Posts are kept for reading, but nobody can add new ones.</Empty>}
                  {posts.length === 0 && !archived && (
                    <div className="card"><strong>No posts here yet.</strong><p className="muted">{isMember ? "Be the first. Ask a question or share something that worked." : "Join the group to start the conversation."}</p></div>
                  )}
                  {posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)}
                  <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={`/groups/${slug}`} />
                </>
              )}
              {tab === "members" && (
                <div className="card">
                  <h2>Members</h2>
                  <div className="list">
                    {members.map((m) => (
                      <div key={m.user_id} className="row">
                        <ZipAv name={m.profile.full_name || "M"} src={m.profile.avatar_url} size="s" />
                        <div className="stack grow"><Link href={`/members/${m.user_id}`} className="namebtn">{m.profile.full_name}</Link></div>
                        <span className="muted small">{m.role === "admin" ? "Owner" : m.role === "moderator" ? "Moderator" : "Member"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === "rules" && (
                <div className="card">
                  <h2>Group rules</h2>
                  <p style={{ whiteSpace: "pre-line" }}>{group.rules || "This group has not set any rules yet."}</p>
                  <p className="muted small">{JOIN_MODES.find((m) => m.value === group.join_mode)?.label}</p>
                </div>
              )}
              {tab === "manage" && isMod && (
                <>
                  {group.join_mode === "request" && (
                    <div className="card">
                      <div className="row"><h2 className="grow">Requests to join</h2><span className={`pill ${requests.length ? "warn" : "on"}`}>{requests.length} waiting</span></div>
                      {requests.length === 0 && <p className="muted">No one is waiting.</p>}
                      <div className="list">
                        {requests.map((r) => (
                          <div key={r.user_id} className="row">
                            <ZipAv name={r.profile.full_name || "M"} src={r.profile.avatar_url} size="s" />
                            <div className="stack grow"><strong>{r.profile.full_name}</strong>{r.message && <span className="muted small">{r.message}</span>}</div>
                            <form action={decideRequest.bind(null, group.id, r.user_id, true)}><SubmitButton>Approve</SubmitButton></form>
                            <form action={decideRequest.bind(null, group.id, r.user_id, false)}><SubmitButton tone="ghost">Decline</SubmitButton></form>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="card">
                    <h2>Members</h2>
                    <div className="list">
                      {members.map((m) => (
                        <div key={m.user_id} className="row" style={{ flexWrap: "wrap" }}>
                          <ZipAv name={m.profile.full_name || "M"} src={m.profile.avatar_url} size="s" />
                          <div className="stack grow"><strong>{m.profile.full_name}</strong><span className="muted small">{m.role === "admin" ? "Owner" : m.role === "moderator" ? "Moderator" : "Member"}</span></div>
                          {m.role !== "admin" && (
                            <>
                              {isAdmin && (
                                <form action={setMemberRole.bind(null, group.id, m.user_id, m.role === "moderator" ? "member" : "moderator")}>
                                  <SubmitButton tone="outline" className="!px-3 !py-1.5">{m.role === "moderator" ? "Remove moderator" : "Make moderator"}</SubmitButton>
                                </form>
                              )}
                              {(isAdmin || m.role === "member") && (
                                <form action={removeMember.bind(null, group.id, m.user_id)}><SubmitButton tone="danger" className="!px-3 !py-1.5">Remove</SubmitButton></form>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {(isAdmin || viewer.isStaff) && (
                    <div className="card">
                      <h2>Group details</h2>
                      <ManageGroupForm groupId={group.id} g={{ description: group.description, rules: group.rules ?? "", cover: group.cover, category: group.category, join_mode: group.join_mode }} types={settings.types} isAdmin={isAdmin || viewer.isStaff} isPrivate={group.is_private} />
                    </div>
                  )}
                  {isAdmin && settings.msg_all && !archived && (
                    <div className="card">
                      <h2>Message all members</h2>
                      <p className="muted small">Arrives as a direct message. Up to three a day.</p>
                      <MessageAllForm groupId={group.id} />
                    </div>
                  )}
                  {isAdmin && settings.archive && (
                    <form action={setGroupArchived.bind(null, group.id, !archived)} className="card">
                      <p className="muted">{archived ? "Bring this group back so members can post again." : "Archiving keeps the posts but stops new ones."}</p>
                      <SubmitButton tone="outline">{archived ? "Restore group" : "Archive group"}</SubmitButton>
                    </form>
                  )}
                </>
              )}
            </section>

            <aside className="rail" style={{ flex: "1 1 280px" }} aria-label="About this group">
              {hostRow && (
                <div className="card">
                  <h2>Group host</h2>
                  <div className="row">
                    <ZipAv name={hostRow.full_name || "M"} src={hostRow.avatar_url} />
                    <div className="stack grow"><Link href={`/members/${hostRow.id}`} className="namebtn">{hostRow.full_name}</Link><span className="muted small">{hostRow.headline}</span></div>
                  </div>
                  {userId && hostRow.id !== userId && <Link href={`/messages?to=${hostRow.id}`} className="btn sm ghost" style={{ alignSelf: "flex-start" }}>Message the host</Link>}
                </div>
              )}
              <div className="card">
                <h2>Members</h2>
                <div className="list">
                  {faces.map((m) => (
                    <div key={m.id} className="row">
                      <ZipAv name={m.full_name || "M"} src={m.avatar_url} size="s" />
                      <div className="stack grow"><Link href={`/members/${m.id}`} className="namebtn">{m.full_name}</Link><span className="muted small">{m.location}</span></div>
                    </div>
                  ))}
                </div>
                {count > faces.length && <Link href={tabLink("members")} className="muted small">and {count - faces.length} more</Link>}
              </div>
              {tab !== "rules" && (
                <div className="card">
                  <h2>Group rules</h2>
                  <p className="small" style={{ whiteSpace: "pre-line" }}>{group.rules || "This group has not set any rules yet."}</p>
                </div>
              )}
              {relList.length > 0 && (
                <div className="card">
                  <h2>Related groups</h2>
                  <div className="list">
                    {relList.map((x) => (
                      <div key={x.id} className="row">
                        <span className="gthumb"><Scene n={x.cover} h={80} /></span>
                        <Link href={`/groups/${x.slug}`} className="namebtn grow">{x.name}</Link>
                        <JoinBtn groupId={x.id} slug={x.slug} mode={x.join_mode} priv={x.is_private} joined={relMine.has(x.id)} host={x.created_by === userId} requested={false} signedIn={!!userId} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
