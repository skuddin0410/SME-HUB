import Link from "next/link";
import { fetchPosts, getViewer, PAGE_SIZE } from "@/lib/hub";
import { KINDS, type Kind } from "@/lib/demo";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer } from "@/components/hub-client";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "question", label: "Questions" },
  { key: "win", label: "Wins" },
  { key: "offer", label: "Offers" },
  { key: "hiring", label: "Hiring" },
];

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ page?: string; kind?: string }> }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const kind = params.kind && params.kind in KINDS ? (params.kind as Kind) : undefined;
  const viewer = await getViewer();
  const posts = await fetchPosts(viewer.supabase, viewer.userId, { page, kind });

  return (
    <>
      {viewer.profile && !viewer.profile.headline && (
        <Link
          href="/profile/edit"
          className="panel flex items-center justify-between gap-3 border-primary/20 bg-primary/5 p-4 text-sm lg:hidden"
        >
          <span>
            <span className="font-semibold">Your profile is almost empty.</span> Add a headline so other owners know who you are.
          </span>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Finish profile</span>
        </Link>
      )}
      <Composer me={viewer.profile} />

      <nav className="-my-1 flex gap-2 overflow-x-auto py-1" aria-label="Filter the feed">
        {FILTERS.map((f) => {
          const active = (kind ?? "") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key ? `/feed?kind=${f.key}` : "/feed"}
              aria-current={active ? "page" : undefined}
              className={`press shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                active ? "bg-primary text-white shadow-sm shadow-primary/30" : "border bg-white text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {posts.length === 0 && (
        <Empty title={kind ? `No ${KINDS[kind].label.toLowerCase()} posts yet` : "The feed is quiet"}>
          {kind ? "Be the first to post one." : "Be the first to share a win, a question or a lesson from your business."}
        </Empty>
      )}
      <div className="stagger flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} />
        ))}
      </div>
      <Pager page={page} hasMore={posts.length === PAGE_SIZE} base={kind ? `/feed?kind=${kind}` : "/feed"} />
    </>
  );
}
