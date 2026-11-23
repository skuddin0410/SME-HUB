import Link from "next/link";
import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { CATALOGUE } from "@/lib/email/render";
import { emailDomain } from "@/lib/email/senders";
import { Badge, BTN_OUTLINE, BTN_PRIMARY, Card, Empty, Facts, INPUT, PageHeader, Pager, Person, SELECT, TABLE, TD, TH, type Tone } from "@/components/cms/ui";

export const metadata = { title: "Emails" };
type Who = { id: string; full_name: string; avatar_url: string | null };

const CATEGORIES = [...new Set(CATALOGUE.map((e) => e.category))];
const TYPE_TONE = (type: string): Tone => (/^Security/.test(type) ? "amber" : /^Billing/.test(type) ? "green" : /^Account/.test(type) ? "blue" : /^Digest|^Notification/.test(type) ? "zinc" : "violet");

export default async function CmsEmails({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; category?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 80);
  const category = CATEGORIES.includes(sp.category ?? "") ? sp.category! : "";
  const list = CATALOGUE.filter((e) => (!category || e.category === category) && (!q || `${e.name} ${e.id} ${e.trigger} ${e.subject}`.toLowerCase().includes(q)));

  const { supabase } = await requireCms();
  const { data, count, error } = await supabase.from("welcome_emails").select("user_id, sent_at", { count: "exact" }).order("sent_at", { ascending: false }).range(...rangeOf(page));
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { user_id: string; sent_at: string }[];
  const { data: ppl } = rows.length ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", rows.map((r) => r.user_id)) : { data: [] };
  const people = new Map(((ppl ?? []) as Who[]).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Emails" description={`All ${CATALOGUE.length} SME Hub emails: when each is sent, from which address, and how it looks.`} />
      <form className="flex flex-wrap items-center gap-2" role="search">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search emails" aria-label="Search emails" className={`${INPUT} w-64`} />
        <select name="category" defaultValue={category} aria-label="Category" className={SELECT}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className={BTN_PRIMARY}>Filter</button>
        {(q || category) && <Link href="/cms/emails" className={BTN_OUTLINE}>Clear</Link>}
      </form>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card flush title={`Emails the hub sends (${list.length})`}>
          {list.length === 0 ? (
            <Empty>No email matches that search.</Empty>
          ) : (
            <table className={TABLE}>
              <thead><tr><th className={TH}>Email</th><th className={TH}>Category</th><th className={TH}>From</th><th className={TH}>Type</th></tr></thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td className={TD}>
                      <Link href={`/cms/emails/${e.id}`} className="font-medium text-zinc-900 hover:underline">{e.name}</Link>
                      <span className="block max-w-[30rem] text-[0.8125rem] text-zinc-500">{e.trigger}</span>
                    </td>
                    <td className={`${TD} text-zinc-600`}>{e.category}</td>
                    <td className={`${TD} whitespace-nowrap text-zinc-600`}>{e.sender.replace(/^.*</, "").replace(">", "")}</td>
                    <td className={TD}><Badge tone={TYPE_TONE(e.type)}>{e.type.replace(/\s*\(.*$/, "")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Delivery">
          <Facts
            rows={[
              ["Sent through", `Resend, from the ${emailDomain()} domain`],
              ["Welcome emails", `${count ?? 0} delivered`],
              ["Not confirmed yet", <Link key="u" href="/cms/members?confirmed=no" className="text-blue-600 hover:underline">See members who have not clicked their link</Link>],
              ["Delivery logs", "Bounces, opens and the other emails are in the Resend dashboard"],
            ]}
          />
        </Card>
      </div>
      <Card flush title="Welcome emails delivered">
        {rows.length === 0 ? (
          <Empty>No welcome emails yet. One goes out the first time a new member confirms their email.</Empty>
        ) : (
          <table className={TABLE}>
            <thead><tr><th className={TH}>Member</th><th className={TH}>Sent</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id}><td className={TD}><Person person={people.get(r.user_id)} size={28} /></td><td className={`${TD} text-zinc-600`}>{fmtDate(r.sent_at, true)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/emails" />
    </>
  );
}
