import Link from "next/link";
import { Lock } from "lucide-react";
import { requireCms, pageOf, rangeOf, cleanSearch, fmtDate, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_PRIMARY, Card, Empty, Filters, INPUT, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsCreateGroup } from "@/app/cms/actions";

export const metadata = { title: "Groups" };
type Row = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_private: boolean;
  created_at: string;
  creator: { id: string; full_name: string; avatar_url: string | null } | null;
  group_members: { count: number }[];
  posts: { count: number }[];
};

export default async function CmsGroups({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const q = cleanSearch(sp.q);
  const { supabase } = await requireCms();
  let query = supabase
    .from("groups")
    .select("id, name, slug, description, is_private, created_at, creator:profiles!groups_created_by_fkey(id, full_name, avatar_url), group_members(count), posts(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Groups" description="Every group and circle, with members and posts." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Filters reset="/cms/groups">
            <input name="q" defaultValue={q} placeholder="Group name or description" aria-label="Search groups" className={`${INPUT} min-w-[13.75rem] flex-1`} />
          </Filters>
          <Card flush>
            {rows.length === 0 ? (
              <Empty>No groups match.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className={TABLE}>
                  <thead>
                    <tr>
                      <th className={TH}>Group</th>
                      <th className={TH}>Created by</th>
                      <th className={`${TH} text-right`}>Members</th>
                      <th className={`${TH} text-right`}>Posts</th>
                      <th className={TH}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((g) => (
                      <tr key={g.id} className="hover:bg-zinc-50/70">
                        <td className={`${TD} max-w-[21.25rem]`}>
                          <Link href={`/cms/groups/${g.id}`} className="flex items-center gap-1.5 font-semibold text-zinc-900 hover:underline">
                            {g.is_private && <Lock className="h-3.5 w-3.5 text-zinc-500" aria-label="Private" />}
                            {g.name}
                          </Link>
                          <span className="line-clamp-1 text-[0.8125rem] text-zinc-500">{g.description || "No description"}</span>
                        </td>
                        <td className={`${TD} max-w-[12.5rem]`}><Person person={g.creator} size={26} /></td>
                        <td className={`${TD} text-right tabular-nums`}>{g.group_members[0]?.count ?? 0}</td>
                        <td className={`${TD} text-right tabular-nums`}>{g.posts[0]?.count ?? 0}</td>
                        <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(g.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/groups" params={{ q }} />
        </div>
        <Card title="Create a group">
          <form action={cmsCreateGroup} className="grid gap-3">
            <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
              Name
              <input name="name" required minLength={3} maxLength={80} placeholder="Toronto Founders" className={INPUT} />
            </label>
            <label className="grid gap-1 text-[0.8438rem] font-medium text-zinc-700">
              Description
              <textarea name="description" rows={3} maxLength={600} className={`${INPUT} h-auto py-2`} />
            </label>
            <label className="flex items-center gap-2 text-[0.875rem] text-zinc-700">
              <input type="checkbox" name="is_private" className="h-4 w-4 rounded border-zinc-300" /> Private (invite only)
            </label>
            <ConfirmSubmit className={BTN_PRIMARY}>Create group</ConfirmSubmit>
            <p className="text-[0.8125rem] text-zinc-500">You become its first member. It appears on the hub straight away. <Badge>live</Badge></p>
          </form>
        </Card>
      </div>
    </>
  );
}
