import { pageMeta, snippet } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchPosts, getViewer } from "@/lib/hub";
import { PostCard } from "@/components/hub";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Post not found" };
  const viewer = await getViewer();
  const [post] = await fetchPosts(viewer.supabase, viewer.userId, { postId: id });
  if (!post) return { title: "Post not found" };
  return pageMeta({
    title: `${post.author.full_name || "A member"} on SMB Hub: ${snippet(post.body, 60)}`,
    description: post.body,
    path: `/posts/${id}`,
    image: post.image_url,
    type: "article",
    index: post.visibility === "public",
  });
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await getViewer();
  const [post] = await fetchPosts(viewer.supabase, viewer.userId, { postId: id });
  if (!post) notFound();

  return (
    <>
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>
      <PostCard post={post} viewer={viewer} startOpen />
    </>
  );
}
