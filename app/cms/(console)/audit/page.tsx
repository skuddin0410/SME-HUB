import { requireCms, pageOf, rangeOf, fmtDate, type CmsEvent } from "@/lib/cms";
import { peopleFor } from "@/components/cms/activity";
import { Card, Empty, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Audit log" };
const SIZE = 50;

export default async function CmsAudit({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const { supabase } = await requireCms();
  const { data, error } = await supabase.from("cms_events").select("*").eq("source", "cms").order("at", { ascending: false }).range(...rangeOf(page, SIZE));
  if (error) throw new Error(error.message);
  const events = (data ?? []) as CmsEvent[];
  const people = await peopleFor(supabase, events);

  return (
    <>
      <PageHeader title="Audit log" description="Every change an admin made in the CMS, with who made it and when. Entries cannot be edited or deleted." />
      <Card flush>
        {events.length === 0 ? (
          <Empty>No admin actions yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead><tr><th className={TH}>When</th><th className={TH}>Admin</th><th className={TH}>Action</th><th className={TH}>On</th><th className={TH}>Details</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{fmtDate(e.at, true)}</td>
                    <td className={`${TD} max-w-[200px]`}><Person person={people.get(e.actor_id ?? "")} size={26} /></td>
                    <td className={`${TD} font-medium text-zinc-900`}>{e.action.replace(".", " → ").replace(/_/g, " ")}</td>
                    <td className={`${TD} text-zinc-600`}>{e.entity.replace(/_/g, " ")} <code className="text-[11px] text-zinc-400">{(e.entity_id ?? "").slice(0, 8)}</code></td>
                    <td className={`${TD} max-w-[320px] truncate text-[12px] text-zinc-500`}>{Object.keys(e.data).length ? JSON.stringify(e.data) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pager page={page} size={SIZE} shown={events.length} path="/cms/audit" />
    </>
  );
}
