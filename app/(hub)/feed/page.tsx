import Link from "next/link";
import { fetchPosts, getViewer, PAGE_SIZE } from "@/lib/hub";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer } from "@/components/hub-client";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page) || 1;
  const viewer = await getViewer();
  const posts = await fetchPosts(viewer.supabase, viewer.userId, { page });

  return (
    <>
      {viewer.profile && !viewer.profile.headline && (
        <Link
          href="/profile/edit"
          className="panel flex items-center justify-between gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <span>
            <span className="font-semibold">Your profile is almost empty.</span> Add a headline and photo so other owners
            know who you are.
          </span>
          <span className="shrink-0 rounded-full bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white">Finish profile</span>
        </Link>
      )}
      <Composer me={viewer.profile} />
      {posts.length === 0 && (
        <Empty title="The feed is quiet">Be the first to share a win, a question or a lesson from your business.</Empty>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} viewer={viewer} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base="/feed" />
    </>
  );
}
