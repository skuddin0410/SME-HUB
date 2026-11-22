import Link from "next/link";
import { requireCms, pageOf, rangeOf, fmtDate, isUuid, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_DANGER, Card, Empty, Filters, PageHeader, Pager, Person, SELECT, TABLE, TD, TH } from "@/components/cms/ui";
import { cmsRemoveConnection } from "@/app/cms/actions";

export const metadata = { title: "Connections" };
type Who = { id: string; full_name: string; avatar_url: string | null };
type Row = { requester_id: string; addressee_id: string; status: string; created_at: string; requester: Who | null; addressee: Who | null };

export default async function CmsConnections({ searchParams }: { searchParams: Promise<{ status?: string; member?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const status = ["pending", "accepted"].includes(sp.status ?? "") ? sp.status! : "";
  const member = isUuid(sp.member) ? sp.member : "";
  const { supabase } = await requireCms();
  let query = supabase
    .from("connections")
    .select("requester_id, addressee_id, status, created_at, requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url), addressee:profiles!connections_addressee_id_fkey(id, full_name, avatar_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (status) query = query.eq("status", status);
  if (member) query = query.or(`requester_id.eq.${member},addressee_id.eq.${member}`);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Connections" description="Who is connected with whom, and requests still waiting." />
      <Filters reset="/cms/connections">
        <select name="status" defaultValue={status} aria-label="Status" className={SELECT}>
          <option value="">Accepted and pending</option>
          <option value="accepted">Accepted</option>
          <option value="pending">Pending requests</option>
        </select>
        {member && <input type="hidden" name="member" value={member} />}
      </Filters>
      {member && <p className="text-[0.8438rem] text-zinc-600">Showing one member&apos;s connections. <Link href="/cms/connections" className="font-semibold text-blue-600 hover:underline">Show all</Link></p>}
      <Card flush>
        {rows.length === 0 ? (
          <Empty>No connections match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>Requested by</th><th className={TH}>Sent to</th><th className={TH}>Status</th><th className={TH}>Since</th><th className={`${TH} text-right`}>Actions</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={`${c.requester_id}:${c.addressee_id}`}>
                    <td className={`${TD} max-w-[15rem]`}><Person person={c.requester} size={28} /></td>
                    <td className={`${TD} max-w-[15rem]`}><Person person={c.addressee} size={28} /></td>
                    <td className={TD}>{c.status === "accepted" ? <Badge tone="green">Connected</Badge> : <Badge tone="amber">Pending</Badge>}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(c.created_at)}</td>
                    <td className={`${TD} text-right`}>
                      <form action={cmsRemoveConnection.bind(null, c.requester_id, c.addressee_id)}>
                        <ConfirmSubmit className={`${BTN_DANGER} h-8 px-2.5`} confirm="Remove this connection? Neither member is told.">
                          {c.status === "accepted" ? "Disconnect" : "Withdraw"}
                        </ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/connections" params={{ status, member }} />
    </>
  );
}
