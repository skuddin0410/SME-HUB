import Link from "next/link";
import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { senderAddress, type Sender } from "@/lib/email/senders";
import { Card, Empty, Facts, PageHeader, Pager, Person, TABLE, TD, TH } from "@/components/cms/ui";

export const metadata = { title: "Emails" };
type Who = { id: string; full_name: string; avatar_url: string | null };

const KINDS: [string, Sender, string][] = [
  ["Confirm your email", "accounts", "Sent at sign-up. The link signs the member in."],
  ["Welcome to SMB Hub", "info", "Sent once, after the email is confirmed."],
  ["Reset your password", "accounts", "Sent from Forgot password."],
  ["One-time sign-in link", "accounts", "Sent from the sign-in page."],
  ["Confirm a new email", "accounts", "Sent when a member changes their email."],
];

export default async function CmsEmails({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageOf((await searchParams).page);
  const { supabase } = await requireCms();
  const { data, count, error } = await supabase.from("welcome_emails").select("user_id, sent_at", { count: "exact" }).order("sent_at", { ascending: false }).range(...rangeOf(page));
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { user_id: string; sent_at: string }[];
  const { data: ppl } = rows.length ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", rows.map((r) => r.user_id)) : { data: [] };
  const people = new Map(((ppl ?? []) as Who[]).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="Emails" description="What the hub sends, from which address, and the welcome emails delivered." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card flush title="Emails the hub sends">
          <table className={TABLE}>
            <thead><tr><th className={TH}>Email</th><th className={TH}>From</th><th className={TH}>When</th></tr></thead>
            <tbody>
              {KINDS.map(([name, from, when]) => (
                <tr key={name}><td className={`${TD} font-medium text-zinc-900`}>{name}</td><td className={`${TD} text-zinc-600`}>{senderAddress(from)}</td><td className={`${TD} text-zinc-600`}>{when}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Delivery">
          <Facts
            rows={[
              ["Sent through", "Resend, from the smbhub.ca domain"],
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
