import Link from "next/link";
import { redirect } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { fetchPosts, getViewer } from "@/lib/hub";
import { FEED } from "@/lib/feed-rules";
import { topSignal } from "@/lib/feed";
import { KINDS, type Kind } from "@/lib/demo";
import { Empty, PostCard } from "@/components/hub";
import { Composer } from "@/components/hub-client";
import { FirstWeek, type WeekStep } from "@/components/first-week";
import { getPostingBusinesses } from "@/lib/business-server";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Feed", description: "What Canadian small business owners are posting: questions, wins, offers and hiring.", path: "/feed" });

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "question", label: "Questions" },
  { key: "win", label: "Wins" },
  { key: "offer", label: "Offers" },
  { key: "hiring", label: "Hiring" },
  { key: "intro", label: "Intros" },
];


type Params = { page?: string; before?: string; scope?: string; kind?: string; sort?: string; saved?: string; compose?: string };

const SCOPES: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "mine", label: "My posts" },
  { key: "reacted", label: "Reacted" },
  { key: "groups", label: "Groups" },
  { key: "conn", label: "Connections" },
  { key: "follow", label: "Following" },
];

/** "2026-11-22T10:00:00+00:00_<uuid>" from the Show older link. */
function parseCursor(raw?: string) {
  const m = raw?.match(/^(.+)_([0-9a-f-]{36})$/i);
  return m && !Number.isNaN(Date.parse(m[1])) ? { createdAt: m[1], id: m[2] } : undefined;
}

function href(p: Params) {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]).toString();
  return q ? `/feed?${q}` : "/feed";
}

const NEW_MEMBER_DAYS = 30;

/** The checklist is for new members only, and each step ticks itself from what the member has done. */
async function firstWeekSteps(viewer: Awaited<ReturnType<typeof getViewer>>): Promise<{ steps: WeekStep[]; count: number } | null> {
  const { supabase, userId, profile } = viewer;
  if (!userId || !profile) return null;
  const age = Date.now() - new Date(profile.created_at).getTime();
  if (age > NEW_MEMBER_DAYS * 86_400_000) return null;
  const { data: connections } = await supabase.rpc("connection_count", { member: userId });
  const count = (connections as number | null) ?? 0;
  const steps: WeekStep[] = [
    {
      key: "profile",
      title: "Set up your business profile",
      text: "Add your role, city and what you can help with.",
      cta: "Edit profile",
      href: "/profile/edit",
      done: !!(profile.headline && profile.location && profile.bio),
    },
    { key: "meet", title: "Say who you want to meet", text: "Pick your ideal customers and the businesses that send you work.", cta: "Choose", href: "/feed", done: false, soon: true },
    {
      key: "connect",
      title: "Connect with people you already know",
      text: "Start with 3 owners you have worked with.",
      cta: "Find people",
      href: "/members",
      done: count >= 3,
    },
    { key: "referrals", title: "See your first referral opportunities", text: "Three people worth meeting, picked for you today.", cta: "See them", href: "/feed", done: false, soon: true },
  ];
  return { steps, count };
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const kind = params.kind && params.kind in KINDS ? (params.kind as Kind) : undefined;
  const latest = params.sort === "latest";
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/");
  const saved = params.saved === "1" && !!viewer.userId;
  const compose = params.compose && params.compose in KINDS ? (params.compose as Kind) : undefined;
  const scope = viewer.userId && SCOPES.some((x) => x.key && x.key === params.scope) ? params.scope : undefined;
  const before = parseCursor(params.before);
  const fetched = await fetchPosts(viewer.supabase, viewer.userId, {
    page,
    before,
    kind,
    savedBy: saved ? viewer.userId! : undefined,
    mine: scope === "mine",
    reactedBy: scope === "reacted" ? viewer.userId! : undefined,
    groupsOnly: scope === "groups",
    connectionsOnly: scope === "conn",
    followingOnly: scope === "follow",
    limit: FEED.pageSize,
  });
  const posts = latest || saved || before || scope ? fetched : topSignal(fetched);
  const week = viewer.userId && viewer.profile ? await firstWeekSteps(viewer) : null;
  const keep = { kind, scope, sort: latest ? "latest" : undefined, saved: saved ? "1" : undefined };
  const last = fetched[fetched.length - 1];
  const older = fetched.length === FEED.pageSize && last ? `${last.created_at}_${last.id}` : null;

  return (
    <>
      {week && !saved && !kind && page === 1 && <FirstWeek steps={week.steps} connections={week.count} />}
      <Composer alwaysOpen me={viewer.profile} initialKind={compose} businesses={await getPostingBusinesses(viewer.userId)} />

      <div className="tools">
        <h2 style={{ font: "700 15px var(--display)" }}>{saved ? "Saved bookmarks" : "Latest from the community"}</h2>
        <span className="grow" />
        {!saved && (
          <Link
            className="chip"
            href={href({ ...keep, sort: latest ? undefined : "latest" })}
            title={latest ? "Showing newest first. Switch to Top Signal" : "Showing what members found most useful. Switch to Latest"}
          >
            <Ic n={latest ? "clock" : "spark"} s={13} /> {latest ? "Latest" : "Top Signal"}
          </Link>
        )}
      </div>
      {viewer.userId && !saved && (
        <nav className="chips" aria-label="Whose posts">
          {SCOPES.map((f) => (
            <Link key={f.key} href={href({ ...keep, scope: f.key || undefined })} aria-current={(scope ?? "") === f.key ? "true" : undefined} className="chip">
              {f.label}
            </Link>
          ))}
          <Link href="/scheduled" className="chip">Scheduled</Link>
        </nav>
      )}
      <nav className="chips" aria-label="Filter the feed">
        {saved ? (
          <>
            <span className="chip" aria-current="true">Saved bookmarks</span>
            <Link href={href({ sort: keep.sort })} className="chip">Back to everything</Link>
          </>
        ) : (
          FILTERS.map((f) => (
            <Link key={f.key} href={href({ ...keep, kind: f.key || undefined })} aria-current={(kind ?? "") === f.key ? "true" : undefined} className="chip">
              {f.label}
            </Link>
          ))
        )}
      </nav>

      {posts.length === 0 && (
        <Empty title={saved ? "No saved bookmarks yet" : kind ? `No ${KINDS[kind].label.toLowerCase()} posts yet` : "The feed is quiet"}>
          <p>{saved ? "Tap the bookmark on any post to keep it here." : "Switch back to Everything or share the first update with Canadian founders."}</p>
          {(saved || kind) && (
            <Link href="/feed" className="btn sm" style={{ alignSelf: "flex-start" }}>Reset filter</Link>
          )}
        </Empty>
      )}
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} />
        ))}
      </div>
      {older && (
        <div className="flex justify-center">
          <Link href={href({ ...keep, before: older })} rel="next" className="btn ghost">
            Show older posts
          </Link>
        </div>
      )}
    </>
  );
}
