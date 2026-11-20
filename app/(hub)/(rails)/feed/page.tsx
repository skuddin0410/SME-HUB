import Link from "next/link";
import { Sparkles, Clock } from "lucide-react";
import { fetchPosts, getViewer, PAGE_SIZE } from "@/lib/hub";
import { topSignal } from "@/lib/feed";
import { KINDS, type Kind } from "@/lib/demo";
import { Empty, Pager, PostCard } from "@/components/hub";
import { Composer } from "@/components/hub-client";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Feed", description: "What Canadian small business owners are posting: questions, wins, offers and hiring.", path: "/feed" });

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "question", label: "Questions" },
  { key: "win", label: "Wins" },
  { key: "offer", label: "Offers" },
  { key: "hiring", label: "Hiring" },
];

const PILL_ON = "px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 text-white transition-all";
const PILL_OFF = "px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-800 border border-[#E5E5E8] transition-all";

type Params = { page?: string; kind?: string; sort?: string; saved?: string; compose?: string };

function href(p: Params) {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `/feed?${q}` : "/feed";
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const kind = params.kind && params.kind in KINDS ? (params.kind as Kind) : undefined;
  const latest = params.sort === "latest";
  const viewer = await getViewer();
  const saved = params.saved === "1" && !!viewer.userId;
  const compose = params.compose && params.compose in KINDS ? (params.compose as Kind) : undefined;
  const fetched = await fetchPosts(viewer.supabase, viewer.userId, { page, kind, savedBy: saved ? viewer.userId! : undefined });
  const posts = latest || saved ? fetched : topSignal(fetched);
  const keep = { kind, sort: latest ? "latest" : undefined, saved: saved ? "1" : undefined };

  return (
    <>
      <Composer me={viewer.profile} initialKind={compose} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Filter the feed">
          {saved ? (
            <>
              <span className={PILL_ON}>Saved bookmarks</span>
              <Link href={href({ sort: keep.sort })} className={PILL_OFF}>
                Back to everything
              </Link>
            </>
          ) : (
            FILTERS.map((f) => {
              const active = (kind ?? "") === f.key;
              return (
                <Link key={f.key} href={href({ ...keep, kind: f.key || undefined })} aria-current={active ? "page" : undefined} className={active ? PILL_ON : PILL_OFF}>
                  {f.label}
                </Link>
              );
            })
          )}
        </nav>
        {!saved && (
          <Link
            href={href({ ...keep, sort: latest ? undefined : "latest" })}
            title={latest ? "Showing newest first. Switch to Top Signal" : "Showing what members found most useful. Switch to Latest"}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E5E5E8] text-[11px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            {latest ? <Clock className="w-3 h-3 text-blue-600" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
            <span>{latest ? "Latest" : "Top Signal"}</span>
          </Link>
        )}
      </div>

      {posts.length === 0 && (
        <Empty title={saved ? "No saved bookmarks yet" : kind ? `No ${KINDS[kind].label.toLowerCase()} posts yet` : "The feed is quiet"}>
          <p>{saved ? "Tap the bookmark on any post to keep it here." : "Switch back to Everything or share the first update with Canadian founders."}</p>
          {(saved || kind) && (
            <Link href="/feed" className="mt-3 inline-block px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold">
              Reset filter
            </Link>
          )}
        </Empty>
      )}
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} />
        ))}
      </div>
      <Pager page={page} hasMore={fetched.length === PAGE_SIZE} base={href(keep)} />
    </>
  );
}
