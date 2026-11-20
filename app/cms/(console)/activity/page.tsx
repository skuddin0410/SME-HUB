import { requireCms, pageOf, rangeOf, ENTITY_FILTERS, type CmsEvent } from "@/lib/cms";
import { ActivityList, peopleFor } from "@/components/cms/activity";
import { Card, Filters, PageHeader, Pager, SELECT } from "@/components/cms/ui";

export const metadata = { title: "Live activity" };
const SIZE = 50;

export default async function CmsActivity({ searchParams }: { searchParams: Promise<{ entity?: string; action?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const entity = ENTITY_FILTERS.some((f) => f.value === sp.entity) ? sp.entity! : "";
  const action = ["insert", "update", "delete"].includes(sp.action ?? "") ? sp.action! : "";
  const { supabase } = await requireCms();
  let query = supabase.from("cms_events").select("*").eq("source", "hub").order("at", { ascending: false }).range(...rangeOf(page, SIZE));
  if (entity) query = query.eq("entity", entity);
  if (action) query = query.eq("action", action);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const events = (data ?? []) as CmsEvent[];
  const people = await peopleFor(supabase, events);

  return (
    <>
      <PageHeader title="Live activity" description="Every change on the hub as it happens: sign-ups, posts, reactions, connections, groups and more." />
      <Filters reset="/cms/activity">
        <select name="entity" defaultValue={entity} aria-label="What changed" className={SELECT}>
          <option value="">Everything</option>
          {ENTITY_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select name="action" defaultValue={action} aria-label="Change" className={SELECT}>
          <option value="">Created, edited or deleted</option>
          <option value="insert">Created</option>
          <option value="update">Edited</option>
          <option value="delete">Deleted</option>
        </select>
      </Filters>
      <Card flush><ActivityList events={events} people={people} /></Card>
      <Pager page={page} size={SIZE} shown={events.length} path="/cms/activity" params={{ entity, action }} />
    </>
  );
}
