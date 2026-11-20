import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireCms, fmtDate, isUuid } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_DANGER, BTN_OUTLINE, BTN_PRIMARY, Card, Empty, Facts, INPUT, Person, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsCancelInvite, cmsDeleteGroup, cmsRemoveFromGroup, cmsSetGroupRole, cmsUpdateGroup } from "@/app/cms/actions";

export const metadata = { title: "Group" };
type Who = { id: string; full_name: string; avatar_url: string | null; headline?: string };

export default async function CmsGroup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase } = await requireCms();
  const [{ data: g }, { data: members }, { data: invites }, { count: posts }] = await Promise.all([
    supabase.from("groups").select("id, name, slug, description, is_private, created_at, creator:profiles!groups_created_by_fkey(id, full_name, avatar_url)").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("role, created_at, user:profiles!group_members_user_id_fkey(id, full_name, avatar_url, headline)").eq("group_id", id).order("created_at"),
    supabase.from("group_invites").select("created_at, user:profiles!group_invites_user_id_fkey(id, full_name, avatar_url), by:profiles!group_invites_invited_by_fkey(id, full_name, avatar_url)").eq("group_id", id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("group_id", id),
  ]);
  if (!g) notFound();
  const hub = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <>
      <Link href="/cms/groups" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All groups
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-jakarta text-[22px] font-extrabold tracking-tight text-zinc-950">{g.name}</h1>
        <span className="flex gap-2">
          <Link href={`/cms/posts?group=${g.id}`} className={BTN_OUTLINE}>{posts ?? 0} posts</Link>
          <a href={`${hub}/groups/${g.slug}`} target="_blank" rel="noreferrer" className={BTN_OUTLINE}><ExternalLink className="h-3.5 w-3.5" /> View on hub</a>
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card flush title={`Members (${(members ?? []).length})`}>
            {(members ?? []).length === 0 ? (
              <Empty>No members.</Empty>
            ) : (
              <table className={TABLE}>
                <thead>
                  <tr>
                    <th className={TH}>Member</th>
                    <th className={TH}>Role</th>
                    <th className={TH}>Joined</th>
                    <th className={`${TH} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((m) => {
                    const u = m.user as unknown as Who;
                    if (!u) return null;
                    return (
                      <tr key={u.id}>
                        <td className={`${TD} max-w-[280px]`}><Person person={u} sub={u.headline} size={28} /></td>
                        <td className={TD}>{m.role === "admin" ? <Badge tone="violet">Group admin</Badge> : <Badge>Member</Badge>}</td>
                        <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(m.created_at)}</td>
                        <td className={`${TD} text-right`}>
                          <span className="inline-flex gap-1.5">
                            <form action={cmsSetGroupRole.bind(null, g.id, u.id, m.role === "admin" ? "member" : "admin")}>
                              <ConfirmSubmit className={`${BTN_OUTLINE} h-8 px-2.5`}>{m.role === "admin" ? "Remove admin" : "Make admin"}</ConfirmSubmit>
                            </form>
                            <form action={cmsRemoveFromGroup.bind(null, g.id, u.id)}>
                              <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm={`Remove ${u.full_name} from ${g.name}?`}>Remove</ConfirmSubmit>
                            </form>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          {(invites ?? []).length > 0 && (
            <Card flush title="Pending invites">
              <ul className="divide-y divide-zinc-100">
                {(invites ?? []).map((i, n) => {
                  const u = i.user as unknown as Who;
                  return (
                    <li key={n} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                      <div className="min-w-0 flex-1"><Person person={u} sub={`Invited by ${(i.by as unknown as Who | null)?.full_name ?? "a member"} · ${fmtDate(i.created_at)}`} size={28} /></div>
                      <form action={cmsCancelInvite.bind(null, g.id, u.id)}>
                        <ConfirmSubmit className={`${BTN_OUTLINE} h-8 px-2.5`}>Cancel invite</ConfirmSubmit>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Details">
            <Facts rows={[["Created by", <Person key="c" person={g.creator as unknown as Who} size={24} />], ["Created", fmtDate(g.created_at, true)], ["Address", <code key="s" className="text-[12px]">/groups/{g.slug}</code>]]} />
          </Card>
          <Card title="Edit group">
            <form action={cmsUpdateGroup.bind(null, g.id)} className="grid gap-3">
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                Name
                <input name="name" defaultValue={g.name} required minLength={3} maxLength={80} className={INPUT} />
              </label>
              <label className="grid gap-1 text-[12.5px] font-medium text-zinc-700">
                Description
                <textarea name="description" defaultValue={g.description ?? ""} rows={4} maxLength={600} className={`${INPUT} h-auto py-2`} />
              </label>
              <label className="flex items-center gap-2 text-[13px] text-zinc-700">
                <input type="checkbox" name="is_private" defaultChecked={g.is_private} className="h-4 w-4 rounded border-zinc-300" /> Private (invite only)
              </label>
              <ConfirmSubmit className={BTN_PRIMARY}>Save changes</ConfirmSubmit>
            </form>
          </Card>
          <Card title="Danger zone">
            <form action={cmsDeleteGroup.bind(null, g.id)}>
              <ConfirmSubmit className={BTN_DANGER} confirm={`Delete ${g.name} with all its posts and memberships? This cannot be undone.`}>Delete group</ConfirmSubmit>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
