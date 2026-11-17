import Link from "next/link";
import { requireStaff, timeAgo } from "@/lib/hub";
import { SubmitButton } from "@/components/hub-client";
import { adminResolveReport, adminUpdateMember } from "@/app/(hub)/actions";

type Report = {
  id: string;
  reason: string;
  created_at: string;
  post_id: string | null;
  reporter: { id: string; full_name: string };
  post: { body: string; author_id: string } | null;
};

export default async function AdminReports() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, post_id, reporter:profiles!reports_reporter_id_fkey(id, full_name), post:posts!reports_post_id_fkey(body, author_id)",
    )
    .eq("status", "open")
    .order("created_at");
  const reports = (data ?? []) as unknown as Report[];

  return (
    <>
      <h1 className="text-2xl font-bold">Reports</h1>
      {reports.length === 0 && (
        <div className="panel px-6 py-12 text-center">
          <p className="font-display text-lg font-semibold">All clear</p>
          <p className="text-sm text-muted-foreground">There are no open reports.</p>
        </div>
      )}
      {reports.map((r) => (
        <section key={r.id} className="panel space-y-3 p-4 text-sm">
          <p>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold capitalize text-rose-700">{r.reason}</span>{" "}
            <span className="text-muted-foreground">
              reported by{" "}
              <Link href={`/members/${r.reporter.id}`} className="font-medium text-foreground hover:underline">
                {r.reporter.full_name || "Member"}
              </Link>
              , {timeAgo(r.created_at)}
            </span>
          </p>
          {r.post && <p className="line-clamp-5 whitespace-pre-wrap rounded-xl bg-muted p-3">{r.post.body}</p>}
          <div className="flex flex-wrap gap-2">
            {r.post && (
              <>
                <Link href={`/posts/${r.post_id}`} className="press rounded-full border border-input bg-white px-3 py-1.5 font-semibold hover:bg-muted">
                  Open post
                </Link>
                <form action={adminResolveReport.bind(null, r.id, r.post_id)}>
                  <SubmitButton tone="danger" className="!px-3 !py-1.5">
                    Remove post
                  </SubmitButton>
                </form>
                <form action={adminUpdateMember.bind(null, r.post.author_id)}>
                  <input type="hidden" name="status" value="suspended" />
                  <SubmitButton tone="danger" className="!px-3 !py-1.5">
                    Suspend author
                  </SubmitButton>
                </form>
              </>
            )}
            <form action={adminResolveReport.bind(null, r.id, null)}>
              <SubmitButton tone="dark" className="!px-3 !py-1.5">
                Dismiss report
              </SubmitButton>
            </form>
          </div>
        </section>
      ))}
    </>
  );
}
