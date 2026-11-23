import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCms } from "@/lib/cms";
import { CATALOGUE } from "@/lib/email/render";
import { Badge, Card, Facts } from "@/components/cms/ui";

export const metadata = { title: "Email" };

/** One email as the handoff designed it: computer, phone and plain-text views, filled with sample data. */
export default async function CmsEmail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const e = CATALOGUE.find((c) => c.id === id);
  if (!e) notFound();
  await requireCms();
  const view = (await searchParams).view === "phone" ? "phone" : (await searchParams).view === "text" ? "text" : "computer";
  const tab = (v: string, label: string) => (
    <Link key={v} href={`/cms/emails/${id}?view=${v}`} aria-current={view === v ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-[0.875rem] font-semibold ${view === v ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
      {label}
    </Link>
  );
  return (
    <>
      <Link href="/cms/emails" className="inline-flex items-center gap-1 text-[0.8438rem] font-medium text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="h-3.5 w-3.5" /> All emails
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-jakarta text-[1.4688rem] font-extrabold tracking-tight text-zinc-950">{e.name}</h1>
        <Badge tone="blue">{e.category}</Badge>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <Card title="Preview" actions={<nav aria-label="View" className="flex gap-1">{[tab("computer", "Computer"), tab("phone", "Phone"), tab("text", "Plain text")]}</nav>}>
          <div className="flex justify-center bg-zinc-100 p-4">
            {view === "text" ? (
              <iframe title="Plain-text version" src={`/email-preview/${id}.txt`} className="h-[34rem] w-full max-w-[40rem] rounded-lg border border-zinc-200 bg-white" />
            ) : (
              <iframe title="Email preview" src={`/email-preview/${id}.html`} style={{ width: view === "phone" ? 375 : 680 }} className="h-[44rem] max-w-full rounded-lg border border-zinc-200 bg-white" />
            )}
          </div>
        </Card>
        <Card title="Details">
          <Facts
            rows={[
              ["Sent when", e.trigger],
              ["From", e.sender],
              ["Subject", <span key="s" className="break-words">{e.subject}</span>],
              ["Preview text", <span key="p" className="break-words">{e.preheader}</span>],
              ["Type", e.type],
              ["Variables", e.variables.length ? <code key="v" className="break-words text-[0.8125rem]">{e.variables.join(", ")}</code> : "None"],
              ...(e.lists.length ? ([["Lists", <code key="l" className="text-[0.8125rem]">{e.lists.join(", ")}</code>]] as [string, React.ReactNode][]) : []),
              ["Size", `${e.size_kb} KB`],
            ]}
          />
        </Card>
      </div>
    </>
  );
}
