import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireCms, fmtDate, timeAgo, isUuid, type CmsEvent, type CmsUser } from "@/lib/cms";
import { MEMBER_TYPES } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";
import { ConfirmSubmit } from "@/components/cms/client";
import { ActivityList, peopleFor } from "@/components/cms/activity";
import { Badge, BTN_DANGER, BTN_OUTLINE, BTN_PRIMARY, Card, Empty, Facts, INPUT, PLAN_TONE, SELECT } from "@/components/cms/ui";
import { cmsDeleteMember, cmsRemoveAvatar, cmsSetMemberStatus, cmsUpdateMember } from "@/app/cms/actions";

export const metadata = { title: "Member" };

export default async function CmsMember({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, profile: me } = await requireCms();

  const [{ data: rows }, { data: posts }, { data: groups }, { data: companies }, { data: reportsAbout }, { data: conns }, { data: convs }, { data: ev }, { data: bio }] =
    await Promise.all([
      supabase.rpc("cms_users", { p_id: id, p_limit: 1 }),
      supabase.from("posts").select("id, body, kind, created_at, pinned_at").eq("author_id", id).order("created_at", { ascending: false }).limit(8),
      supabase.from("group_members").select("role, created_at, group:groups(id, name)").eq("user_id", id),
      supabase.from("companies").select("id, name, category, slug").eq("owner_id", id),
      supabase.from("reports").select("id, reason, status, created_at").eq("profile_id", id).order("created_at", { ascending: false }),
      supabase.from("connections").select("status").or(`requester_id.eq.${id},addressee_id.eq.${id}`),
      supabase.rpc("cms_conversations", { p_member: id, p_limit: 200 }),
      supabase.from("cms_events").select("*").or(`actor_id.eq.${id},entity_id.eq.${id}`).order("at", { ascending: false }).limit(20),
      supabase.from("profiles").select("bio, website").eq("id", id).maybeSingle(),
    ]);
  const m = ((rows ?? []) as CmsUser[])[0];
  if (!m) notFound();
  const events = (ev ?? []) as CmsEvent[];
  const people = await peopleFor(supabase, events);
  const accepted = (conns ?? []).filter((c) => c.status === "accepted").length;
  const pending = (conns ?? []).length - accepted;
  const self = m.id === me.id;
  const hub = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <>
      <Link href="/cms/members" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All members
      </Link>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <AvatarImg person={m} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="font-jakarta text-[22px] font-extrabold tracking-tight text-zinc-950">{m.full_name || "Member"}</h1>
          <p className="text-[13px] text-zinc-600">{m.headline || "No headline"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={PLAN_TONE[m.member_type]}>{MEMBER_TYPES[m.member_type]}</Badge>
            {m.status === "suspended" ? <Badge tone="rose">Suspended</Badge> : <Badge tone="green">Active</Badge>}
            {m.role === "admin" && <Badge tone="violet">Admin</Badge>}
            {!m.email_confirmed_at && <Badge tone="amber">Email not confirmed</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`${hub}/members/${m.id}`} target="_blank" rel="noreferrer" className={BTN_OUTLINE}>
            <ExternalLink className="h-3.5 w-3.5" /> View on hub
          </a>
          {!self && (
            <form action={cmsSetMemberStatus.bind(null, m.id, m.status === "suspended" ? "active" : "suspended")}>
              <ConfirmSubmit
                className={m.status === "suspended" ? BTN_OUTLINE : BTN_DANGER}
                confirm={m.status === "suspended" ? undefined : `Suspend ${m.full_name}? They will not be able to post, comment or message until reactivated.`}
              >
                {m.status === "suspended" ? "Reactivate" : "Suspend"}
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Edit profile">
            <form action={cmsUpdateMember.bind(null, m.id)} className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                Full name
                <input name="full_name" defaultValue={m.full_name} maxLength={80} className={INPUT} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                City / location
                <input name="location" defaultValue={m.location} maxLength={80} className={INPUT} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700 sm:col-span-2">
                Headline
                <input name="headline" defaultValue={m.headline} maxLength={160} className={INPUT} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700 sm:col-span-2">
                Website
                <input name="website" defaultValue={bio?.website ?? ""} maxLength={200} className={INPUT} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700 sm:col-span-2">
                About
                <textarea name="bio" defaultValue={bio?.bio ?? ""} maxLength={2000} rows={4} className={`${INPUT} h-auto py-2`} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                Plan
                <select name="member_type" defaultValue={m.member_type} className={SELECT}>
                  {Object.entries(MEMBER_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                Role
                <select name="role" defaultValue={m.role} disabled={self} className={`${SELECT} disabled:opacity-50`}>
                  <option value="member">Member</option>
                  <option value="admin">Admin (CMS access)</option>
                </select>
              </label>
              <div className="flex items-center gap-2 sm:col-span-2">
                <ConfirmSubmit className={BTN_PRIMARY}>Save changes</ConfirmSubmit>
                {self && <span className="text-[12px] text-zinc-500">You cannot change your own role.</span>}
              </div>
            </form>
          </Card>

          <Card
            flush
            title={`Posts (${m.posts})`}
            actions={<Link href={`/cms/posts?author=${m.id}`} className="text-[12.5px] font-semibold text-blue-600 hover:underline">All posts</Link>}
          >
            {(posts ?? []).length === 0 ? (
              <Empty>No posts yet.</Empty>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(posts ?? []).map((p) => (
                  <li key={p.id} className="flex items-start gap-3 px-4 py-3 text-[13px]">
                    <Link href={`/cms/posts/${p.id}`} className="min-w-0 flex-1 text-zinc-900 hover:underline">
                      <span className="line-clamp-2">{p.body}</span>
                    </Link>
                    <Badge>{p.kind}</Badge>
                    {p.pinned_at && <Badge tone="blue">Pinned</Badge>}
                    <span className="whitespace-nowrap text-[12px] text-zinc-500">{fmtDate(p.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card flush title="Recent activity">
            <ActivityList events={events} people={people} compact />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Account">
            <Facts
              rows={[
                ["Email", <a key="e" href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a>],
                ["Signs in with", <span key="p" className="capitalize">{m.provider}</span>],
                ["Email confirmed", m.email_confirmed_at ? fmtDate(m.email_confirmed_at, true) : "Not yet"],
                ["Joined", fmtDate(m.created_at, true)],
                ["Last sign-in", m.last_sign_in_at ? `${timeAgo(m.last_sign_in_at)} (${fmtDate(m.last_sign_in_at, true)})` : "Never"],
                ["Member id", <code key="i" className="text-[11.5px] text-zinc-500">{m.id}</code>],
              ]}
            />
          </Card>

          <Card title="Network">
            <Facts
              rows={[
                ["Connections", <Link key="c" href={`/cms/connections?member=${m.id}`} className="text-blue-600 hover:underline">{accepted} accepted, {pending} pending</Link>],
                ["Conversations", <Link key="m" href={`/cms/messages?member=${m.id}`} className="text-blue-600 hover:underline">{(convs ?? []).length}</Link>],
                [
                  "Groups",
                  (groups ?? []).length ? (
                    <span key="g" className="flex flex-wrap gap-1">
                      {(groups ?? []).map((g) => {
                        const grp = g.group as unknown as { id: string; name: string } | null;
                        return grp ? (
                          <Link key={grp.id} href={`/cms/groups/${grp.id}`} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[12px] hover:bg-zinc-200">
                            {grp.name}{g.role === "admin" ? " (admin)" : ""}
                          </Link>
                        ) : null;
                      })}
                    </span>
                  ) : (
                    "None"
                  ),
                ],
                [
                  "Businesses",
                  (companies ?? []).length ? (
                    <span key="b" className="flex flex-col">
                      {(companies ?? []).map((c) => (
                        <Link key={c.id} href={`/cms/businesses?q=${encodeURIComponent(c.name)}`} className="text-blue-600 hover:underline">{c.name}</Link>
                      ))}
                    </span>
                  ) : (
                    "None"
                  ),
                ],
                ["Reported", (reportsAbout ?? []).length ? <Link key="r" href="/cms/reports?status=all" className="text-rose-600 hover:underline">{(reportsAbout ?? []).length} {(reportsAbout ?? []).length === 1 ? "time" : "times"}</Link> : "Never"],
              ]}
            />
          </Card>

          <Card title="Danger zone">
            <div className="flex flex-col gap-2">
              {m.avatar_url && (
                <form action={cmsRemoveAvatar.bind(null, m.id)}>
                  <ConfirmSubmit className={BTN_OUTLINE} confirm="Remove this member's profile photo?">Remove profile photo</ConfirmSubmit>
                </form>
              )}
              {self ? (
                <p className="text-[12.5px] text-zinc-500">This is your own account.</p>
              ) : m.role === "admin" ? (
                <p className="text-[12.5px] text-zinc-500">Change their role to Member before deleting this account.</p>
              ) : (
                <form action={cmsDeleteMember.bind(null, m.id)}>
                  <ConfirmSubmit
                    className={BTN_DANGER}
                    confirm={`Delete ${m.full_name || "this member"} for good? Their login, profile, posts, comments, messages, groups they created and business listings are all removed. This cannot be undone.`}
                  >
                    Delete account permanently
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
