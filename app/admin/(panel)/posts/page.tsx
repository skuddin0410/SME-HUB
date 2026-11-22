import Link from "next/link";
import { Pin } from "lucide-react";
import { fetchPosts, requireStaff, timeAgo } from "@/lib/hub";
import { Pager } from "@/components/hub";
import { SubmitButton } from "@/components/hub-client";
import { adminDeletePost, adminPinPost } from "@/app/(hub)/actions";

const SIZE = 25;

export default async function AdminPosts({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page) || 1;
  const { supabase, userId } = await requireStaff();
  const posts = await fetchPosts(supabase, userId, { page, limit: SIZE });

  return (
    <>
      <h1 className="text-2xl font-bold">Posts</h1>
      <p className="-mt-3 text-sm text-muted-foreground">Pin a post to keep it at the top of everyone&apos;s feed.</p>
      <section className="panel divide-y">
        {posts.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No posts yet.</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-[13.75rem] flex-1">
              <p className="text-xs text-muted-foreground">
                <Link href={`/members/${p.author.id}`} className="font-semibold text-foreground hover:underline">
                  {p.author.full_name || "Member"}
                </Link>{" "}
                {timeAgo(p.created_at)}
                {p.group ? ` in ${p.group.name}` : ""}, {p.likes} likes, {p.comments} comments
                {p.pinned_at && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 font-semibold text-amber-900">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                )}
              </p>
              <Link href={`/posts/${p.id}`} className="mt-0.5 line-clamp-2 text-sm hover:underline">
                {p.body}
              </Link>
            </div>
            <div className="flex gap-2">
              <form action={adminPinPost.bind(null, p.id, !p.pinned_at)}>
                <SubmitButton tone="outline" className="!px-3 !py-1.5">
                  {p.pinned_at ? "Unpin" : "Pin"}
                </SubmitButton>
              </form>
              <form action={adminDeletePost.bind(null, p.id)}>
                <SubmitButton tone="danger" className="!px-3 !py-1.5">
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
      </section>
      <Pager page={page} hasMore={posts.length === SIZE} base="/admin/posts" />
    </>
  );
}
