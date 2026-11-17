import Link from "next/link";
import { fetchPosts, getMe, PAGE_SIZE } from "@/lib/hub";
import { Composer, Empty, Pager, PostCard } from "@/components/hub";
import { Card } from "@/components/ui/card";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page) || 1;
  const { supabase, userId, profile } = await getMe();
  const posts = await fetchPosts(supabase, userId, { page });

  return (
    <>
      {profile && !profile.headline && (
        <Card className="p-4 text-sm">
          Finish your profile so other owners know who you are.{" "}
          <Link href="/profile/edit" className="font-semibold underline">
            Add your headline and photo
          </Link>
        </Card>
      )}
      <Composer />
      {posts.length === 0 && <Empty>No posts yet. Be the first to share something.</Empty>}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} meId={userId} isStaff={profile?.role !== "member"} />
      ))}
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base="/feed" />
    </>
  );
}
