import Link from "next/link";
import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { Badge, Card, Empty, Filters, PageHeader, Pager, Person, SELECT, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Notifications" };
type Who = { id: string; full_name: string; avatar_url: string | null };
type Row = { id: string; type: string; read_at: string | null; created_at: string; post_id: string | null; user: Who | null; actor: Who | null };

export default async function CmsNotifications({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const type = /^[a-z_]{1,30}$/.test(sp.type ?? "") ? sp.type! : "";
  const { supabase } = await requireCms();
  let query = supabase
    .from("notifications")
    .select("id, type, read_at, created_at, post_id, user:profiles!notifications_user_id_fkey(id, full_name, avatar_url), actor:profiles!notifications_actor_id_fkey(id, full_name, avatar_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (type) query = query.eq("type", type);
  const [{ data, count, error }, { data: types }] = await Promise.all([query, supabase.from("notifications").select("type").limit(1000)]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  const kinds = [...new Set((types ?? []).map((t) => t.type as string))].sort();

  return (
    <>
      <PageHeader title="Notifications" description="Every in-app notification the hub has sent, and whether it was read." />
      <Filters reset="/cms/notifications">
        <select name="type" defaultValue={type} aria-label="Type" className={SELECT}>
          <option value="">Any type</option>
          {kinds.map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}
        </select>
      </Filters>
      <Card flush>
        {rows.length === 0 ? (
          <Empty>No notifications yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>Sent to</th><th className={TH}>Type</th><th className={TH}>From</th><th className={TH}>Post</th><th className={TH}>Sent</th><th className={TH}>Read</th></tr></thead>
              <tbody>
                {rows.map((n) => (
                  <tr key={n.id}>
                    <td className={`${TD} max-w-[13.75rem]`}><Person person={n.user} size={26} /></td>
                    <td className={TD}><Badge tone="blue">{n.type.replace(/_/g, " ")}</Badge></td>
                    <td className={`${TD} max-w-[13.75rem]`}>{n.actor ? <Person person={n.actor} size={26} /> : <span className="text-zinc-400">SME Hub</span>}</td>
                    <td className={TD}>{n.post_id ? <Link href={`/cms/posts/${n.post_id}`} className="text-blue-600 hover:underline">Open</Link> : <span className="text-zinc-400">—</span>}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(n.created_at, true)}</td>
                    <td className={TD}>{n.read_at ? <Badge tone="green">Read</Badge> : <Badge tone="amber">Unread</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/notifications" params={{ type }} />
    </>
  );
}
