import Link from "next/link";
import { notFound } from "next/navigation";
import { getMe, timeAgo } from "@/lib/hub";
import { Empty } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveReport } from "@/app/(hub)/actions";

type Report = {
  id: string;
  reason: string;
  created_at: string;
  post_id: string | null;
  reporter: { id: string; full_name: string };
  post: { body: string; author_id: string } | null;
};

export default async function ReportsPage() {
  const { supabase, profile } = await getMe();
  if (!profile || profile.role === "member") notFound();

  const { data } = await supabase
    .from("reports")
    .select(
      "id, reason, created_at, post_id, reporter:profiles!reports_reporter_id_fkey(id, full_name), post:posts(body, author_id)",
    )
    .eq("status", "open")
    .order("created_at");
  const reports = (data ?? []) as unknown as Report[];

  return (
    <>
      <h1 className="text-xl font-bold">Open reports</h1>
      {reports.length === 0 && <Empty>No open reports.</Empty>}
      {reports.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-4 text-sm">
          <p>
            <span className="font-semibold capitalize">{r.reason}</span> · reported by{" "}
            <Link href={`/members/${r.reporter.id}`} className="underline">
              {r.reporter.full_name || "Member"}
            </Link>{" "}
            · {timeAgo(r.created_at)}
          </p>
          {r.post && <p className="line-clamp-4 whitespace-pre-wrap rounded-md bg-muted p-3">{r.post.body}</p>}
          <div className="flex flex-wrap gap-2">
            {r.post && (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/posts/${r.post_id}`}>Open post</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/members/${r.post.author_id}`}>Open author</Link>
                </Button>
                <form action={resolveReport.bind(null, r.id, r.post_id)}>
                  <Button type="submit" size="sm" variant="destructive">
                    Remove post
                  </Button>
                </form>
              </>
            )}
            <form action={resolveReport.bind(null, r.id, null)}>
              <Button type="submit" size="sm">
                Dismiss
              </Button>
            </form>
          </div>
        </Card>
      ))}
    </>
  );
}
