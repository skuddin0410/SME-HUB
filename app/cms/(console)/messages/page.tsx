import Link from "next/link";
import { Lock } from "lucide-react";
import { requireCms, pageOf, fmtDate, timeAgo, isUuid, CMS_PAGE } from "@/lib/cms";
import { Badge, Card, Empty, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Messages" };
type Conv = { member_a: string; member_b: string; messages: number; unread: number; first_at: string; last_at: string; total: number };
type Who = { id: string; full_name: string; avatar_url: string | null };

export default async function CmsMessages({ searchParams }: { searchParams: Promise<{ member?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const member = isUuid(sp.member) ? sp.member : null;
  const { supabase } = await requireCms();
  const { data, error } = await supabase.rpc("cms_conversations", { p_member: member, p_limit: CMS_PAGE, p_offset: (page - 1) * CMS_PAGE });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Conv[];
  const ids = [...new Set(rows.flatMap((r) => [r.member_a, r.member_b]))];
  const { data: ppl } = ids.length ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids) : { data: [] };
  const people = new Map(((ppl ?? []) as Who[]).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Messages" description="Direct-message activity between members." />
      <p className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[0.8438rem] text-zinc-600">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
        Message text is private to the two members. The CMS shows who is talking, how many messages and when, never what was said. To act on abuse, use Reports or suspend the member.
      </p>
      {member && <p className="text-[0.8438rem] text-zinc-600">Showing one member&apos;s conversations. <Link href="/cms/messages" className="font-semibold text-blue-600 hover:underline">Show all</Link></p>}
      <Card flush>
        {rows.length === 0 ? (
          <Empty>No direct messages yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>Between</th><th className={TH}>And</th><th className={`${TH} text-right`}>Messages</th><th className={`${TH} text-right`}>Unread</th><th className={TH}>Started</th><th className={TH}>Last message</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={`${c.member_a}:${c.member_b}`}>
                    <td className={`${TD} max-w-[15rem]`}><Person person={people.get(c.member_a)} size={28} /></td>
                    <td className={`${TD} max-w-[15rem]`}><Person person={people.get(c.member_b)} size={28} /></td>
                    <td className={`${TD} text-right tabular-nums`}>{c.messages}</td>
                    <td className={`${TD} text-right`}>{c.unread ? <Badge tone="amber">{c.unread}</Badge> : <span className="text-zinc-400">0</span>}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(c.first_at)}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{timeAgo(c.last_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={rows[0]?.total ?? 0} path="/cms/messages" params={{ member: member ?? "" }} />
    </>
  );
}
