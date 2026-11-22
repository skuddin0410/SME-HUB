import Link from "next/link";
import { requireUser, timeAgo } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { ReplyForm } from "@/components/business-manage";

export const dynamic = "force-dynamic";

type Message = { id: string; body: string; as_business: boolean; created_at: string };
type Inquiry = { id: string; kind: string; status: string; last_at: string; company: { name: string; slug: string } | null; messages: Message[] };

/** What this member sent to businesses, and what came back. */
export default async function MyMessagesPage() {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("business_inquiries")
    .select("id, kind, status, last_at, company:companies!business_inquiries_company_id_fkey(name, slug), messages:business_inquiry_messages(id, body, as_business, created_at)")
    .eq("sender_id", userId)
    .order("last_at", { ascending: false })
    .limit(50);
  const inquiries = (data ?? []) as unknown as Inquiry[];
  return (
    <>
      <PageTitle title="My messages to businesses">
        <Link href="/businesses" className="text-sm font-semibold text-primary hover:underline">See the directory</Link>
      </PageTitle>
      {inquiries.length === 0 && <Empty title="Nothing sent yet">Message a business or ask for a quote from its page.</Empty>}
      {inquiries.map((q) => (
        <section key={q.id} className="panel p-4">
          <p className="mb-3 text-sm font-semibold">
            {q.company ? <Link href={`/businesses/${q.company.slug}`} className="hover:underline">{q.company.name}</Link> : "Business"} · {q.kind === "quote" ? "Quote request" : "Message"} ·{" "}
            <span className="font-normal text-muted-foreground">{q.status} · {timeAgo(q.last_at)}</span>
          </p>
          <ul className="mb-3 grid gap-2">
            {[...q.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.as_business ? "bg-muted" : "ml-auto bg-primary/10"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.as_business ? q.company?.name : "You"} · {timeAgo(m.created_at)}</p>
              </li>
            ))}
          </ul>
          {q.status !== "closed" && <ReplyForm inquiryId={q.id} />}
        </section>
      ))}
    </>
  );
}
