import { redirect } from "next/navigation";
import { fetchPosts, getViewer } from "@/lib/hub";
import { FEED } from "@/lib/feed-rules";
import { topSignal } from "@/lib/feed";
import { VisitorHome } from "@/components/zip/visitor-home";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "SME Hub: Canada's small business community",
  description: "A free community for Canadian small-business owners. Get known, get answers, get customers.",
  path: "/",
});

type Params = { sort?: string };

// The front door: members go straight to their feed; visitors see the welcome page and the public feed.
export default async function Home({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const viewer = await getViewer();
  if (viewer.userId) redirect("/feed");
  const fetched = await fetchPosts(viewer.supabase, null, { page: 1, limit: FEED.pageSize });
  const posts = params.sort === "latest" ? fetched : topSignal(fetched);
  const { data } = await viewer.supabase.from("groups").select("slug, name").eq("is_private", false).eq("status", "active").order("created_at", { ascending: false }).limit(4);
  return <VisitorHome posts={posts} groups={(data ?? []) as { slug: string; name: string }[]} />;
}
