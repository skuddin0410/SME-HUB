import Link from "next/link";
import { requireCms, pageOf, rangeOf, fmtDate, CMS_PAGE } from "@/lib/cms";
import { ConfirmSubmit } from "@/components/cms/client";
import { Badge, BTN_DANGER, BTN_OUTLINE, Card, Empty, PageHeader, Pager, Person } from "@/components/cms/ui";
import { cmsActOnReport, cmsSetReport } from "@/app/cms/actions";

export const metadata = { title: "Reports" };
type Who = { id: string; full_name: string; avatar_url: string | null };
type Row = {
  id: string;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
  post_id: string | null;
  profile_id: string | null;
  reporter: Who | null;
  post: { id: string; body: string; author: Who | null } | null;
  profile: Who | null;
};

export default async function CmsReports({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const status = sp.status === "resolved" || sp.status === "all" ? sp.status : "open";
  const { supabase } = await requireCms();
  let query = supabase
    .from("reports")
    .select(
      "id, reason, status, created_at, post_id, profile_id, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url), post:posts!reports_post_id_fkey(id, body, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)), profile:profiles!reports_profile_id_fkey(id, full_name, avatar_url)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(...rangeOf(page));
  if (status !== "all") query = query.eq("status", status);
  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];

  const tab = (v: string, label: string) => (
    <Link
      href={v === "open" ? "/cms/reports" : `/cms/reports?status=${v}`}
      aria-current={status === v ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-[0.875rem] font-semibold ${status === v ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader title="Reports" description="Posts and members flagged by the community. Decide on each one." />
      <nav aria-label="Report status" className="flex gap-1">{tab("open", "Open")}{tab("resolved", "Resolved")}{tab("all", "All")}</nav>
      {rows.length === 0 ? (
        <Card><Empty>{status === "open" ? "Nothing to review. New reports appear here as soon as they are made." : "No reports."}</Empty></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const target = r.post?.author ?? r.profile;
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-zinc-500">
                      {r.status === "open" ? <Badge tone="rose">Open</Badge> : <Badge tone="green">Resolved</Badge>}
                      <span>Reported {r.post_id ? "a post" : "a member"} · {fmtDate(r.created_at, true)} · by</span>
                      <Person person={r.reporter} size={20} />
                    </p>
                    <p className="mt-2 text-[0.9375rem] font-medium text-zinc-900">“{r.reason || "No reason given"}”</p>
                    {r.post ? (
                      <Link href={`/cms/posts/${r.post.id}`} className="mt-3 block rounded-xl border border-zinc-200 bg-zinc-50 p-3 hover:bg-zinc-100">
                        <Person person={r.post.author} size={24} />
                        <span className="mt-1.5 line-clamp-3 block text-[0.875rem] text-zinc-800">{r.post.body}</span>
                      </Link>
                    ) : r.post_id ? (
                      <p className="mt-3 text-[0.8438rem] text-zinc-500">The post has been deleted.</p>
                    ) : (
                      <div className="mt-3"><Person person={r.profile} sub="Reported member" /></div>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    {r.status === "open" ? (
                      <>
                        {r.post && (
                          <form action={cmsActOnReport.bind(null, r.id, "remove_post", r.post.id)}>
                            <ConfirmSubmit className={`${BTN_DANGER} w-full justify-center`} confirm="Delete the reported post and resolve this report?">Remove post</ConfirmSubmit>
                          </form>
                        )}
                        {target && (
                          <form action={cmsActOnReport.bind(null, r.id, "suspend_member", target.id)}>
                            <ConfirmSubmit className={`${BTN_DANGER} w-full justify-center`} confirm={`Suspend ${target.full_name} and resolve this report?`}>Suspend member</ConfirmSubmit>
                          </form>
                        )}
                        <form action={cmsSetReport.bind(null, r.id, "resolved")}>
                          <ConfirmSubmit className={`${BTN_OUTLINE} w-full justify-center`}>Dismiss, no action</ConfirmSubmit>
                        </form>
                      </>
                    ) : (
                      <form action={cmsSetReport.bind(null, r.id, "open")}>
                        <ConfirmSubmit className={BTN_OUTLINE}>Reopen</ConfirmSubmit>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Pager page={page} size={CMS_PAGE} shown={rows.length} total={count} path="/cms/reports" params={{ status: status === "open" ? "" : status }} />
    </>
  );
}
