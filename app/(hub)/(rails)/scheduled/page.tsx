import Link from "next/link";
import { fetchPosts, requireUser } from "@/lib/hub";
import { Empty } from "@/components/hub";
import { ScheduledRow } from "@/components/scheduled-row";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Scheduled posts", description: "Posts you have scheduled.", path: "/scheduled" });

export default async function ScheduledPage() {
  const { supabase, userId } = await requireUser();
  const posts = await fetchPosts(supabase, userId, { scheduledBy: userId, limit: 50 });
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-zinc-900">Scheduled posts</h1>
        <Link href="/feed" className="text-xs font-semibold text-blue-700 hover:underline">
          Back to the feed
        </Link>
      </div>
      {posts.length === 0 ? (
        <Empty title="Nothing scheduled">
          <p>Use Schedule when you write a post to choose when it goes live.</p>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <ScheduledRow key={p.id} id={p.id} title={p.title} body={p.body} scheduledAt={p.scheduled_at!} />
          ))}
        </ul>
      )}
    </>
  );
}
