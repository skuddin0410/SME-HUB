import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, timeAgo } from "@/lib/hub";
import { Empty, PageTitle } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { ReplyForm } from "@/components/business-manage";
import { setInquiryStatus } from "@/app/(hub)/business-actions";

export const dynamic = "force-dynamic";

type Message = { id: string; body: string; as_business: boolean; created_at: string; author: { full_name: string } | null };
type Inquiry = { id: string; kind: string; status: string; last_at: string; sender: { id: string; full_name: string } | null; messages: Message[] };

/** The shared inbox: everyone with the Owner, Manager or Responder role sees the same conversations. */
export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase } = await requireUser();
  const { data: company } = await supabase.from("companies").select("id, name").eq("slug", slug).maybeSingle();
  if (!company) notFound();
  // the database only returns conversations this member may see; an empty answer for someone without access looks the same as an empty inbox
  const { data } = await supabase
    .from("business_inquiries")
    .select("id, kind, status, last_at, sender:profiles!business_inquiries_sender_id_fkey(id, full_name), messages:business_inquiry_messages(id, body, as_business, created_at, author:profiles!business_inquiry_messages_author_id_fkey(full_name))")
    .eq("company_id", company.id)
    .order("last_at", { ascending: false })
    .limit(50);
  const inquiries = (data ?? []) as unknown as Inquiry[];

  return (
    <>
      <PageTitle title={`${company.name} inbox`}>
        <Link href={`/businesses/${slug}`} className="text-sm font-semibold text-primary hover:underline">View page</Link>
      </PageTitle>
      {inquiries.length === 0 && <Empty title="No messages yet">Messages and quote requests from members show up here.</Empty>}
      {inquiries.map((q) => (
        <section key={q.id} className="panel p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {q.sender?.full_name ?? "Member"} · {q.kind === "quote" ? "Quote request" : "Message"} · <span className="font-normal text-muted-foreground">{timeAgo(q.last_at)}</span>
            </p>
            <span className="flex items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold capitalize">{q.status}</span>
              <form action={setInquiryStatus.bind(null, q.id, q.status === "closed" ? "open" : "closed")}>
                <SubmitButton tone="danger" className="!px-3 !py-1">{q.status === "closed" ? "Reopen" : "Close"}</SubmitButton>
              </form>
            </span>
          </div>
          <ul className="mb-3 grid gap-2">
            {[...q.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((m) => (
              <li key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.as_business ? "ml-auto bg-primary/10" : "bg-muted"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.as_business ? `${m.author?.full_name ?? "Team"} for ${company.name}` : m.author?.full_name} · {timeAgo(m.created_at)}</p>
              </li>
            ))}
          </ul>
          {q.status !== "closed" && <ReplyForm inquiryId={q.id} />}
        </section>
      ))}
    </>
  );
}
