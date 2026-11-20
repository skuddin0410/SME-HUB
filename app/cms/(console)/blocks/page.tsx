import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { Card, Empty, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Blocks" };
type Who = { id: string; full_name: string; avatar_url: string | null };
type Row = { blocker_id: string; blocked_id: string; created_at: string; blocker: Who | null; blocked: Who | null };

export default async function CmsBlocks({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const { supabase } = await requireCms();
  const { data, count, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id, created_at, blocker:profiles!blocks_blocker_id_fkey(id, full_name, avatar_url), blocked:profiles!blocks_blocked_id_fkey(id, full_name, avatar_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  return (
    <>
      <PageHeader title="Blocks" description="Members who blocked someone. A member blocked by many people may need a look." />
      <Card flush>
        {rows.length === 0 ? (
          <Empty>Nobody has blocked anyone.</Empty>
        ) : (
          <table className={TABLE}>
            <thead><tr><th className={TH}>Member</th><th className={TH}>Blocked</th><th className={TH}>When</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={`${b.blocker_id}:${b.blocked_id}`}>
                  <td className={TD}><Person person={b.blocker} size={28} /></td>
                  <td className={TD}><Person person={b.blocked} size={28} /></td>
                  <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(b.created_at, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/blocks" />
    </>
  );
}
