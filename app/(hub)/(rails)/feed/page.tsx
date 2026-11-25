import { AnimatedList } from "@/components/zip/animated-list";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedRefresh } from "@/components/feed-refresh";
import { Ic } from "@/components/zip/ic";
import { fetchPosts, getViewer } from "@/lib/hub";
import { FEED } from "@/lib/feed-rules";
import { topSignal } from "@/lib/feed";
import { KINDS, type Kind } from "@/lib/demo";
import { Empty, PostCard } from "@/components/hub";
import { PostBox } from "@/components/zip/post-box";
import { FeedTools } from "@/components/zip/feed-tools";
import { canStartPost, getComposerRules, getHubSettings } from "@/lib/zip/settings-load";
import { FirstWeek, type WeekStep } from "@/components/first-week";
import { getPostingBusinesses } from "@/lib/business-server";
import { getMyTags, aliasesOf, getTagIndex, getTagRules } from "@/lib/zip/hashtags-server";
import { extractTags } from "@/lib/zip/hashtags";
import { pageMeta } from "@/lib/seo";
import { getMyReady, getSignals } from "@/lib/ready";
import { missLine } from "@/lib/ready-shared";
import { ReadyCard } from "@/components/ready/card";
import { Suspense } from "react";
import { FeedStories } from "@/components/stories/sections";

export const metadata = pageMeta({ title: "Feed", description: "What Canadian small business owners are posting: questions, wins, offers and hiring.", path: "/feed" });

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "question", label: "Questions" },
  { key: "win", label: "Wins" },
  { key: "offer", label: "Offers" },
  { key: "hiring", label: "Hiring" },
  { key: "intro", label: "Intros" },
];


type Params = { tag?: string; page?: string; before?: string; scope?: string; kind?: string; sort?: string; saved?: string; compose?: string; text?: string };

// the "Show:" choices, worded as in the design (Update 9)
const SCOPES: { key: string; label: string }[] = [
  { key: "", label: "All updates" },
  { key: "mine", label: "Created by me" },
  { key: "reacted", label: "I have reacted to" },
  { key: "groups", label: "From my groups" },
  { key: "conn", label: "From my connections" },
  { key: "follow", label: "From people I follow" },
  { key: "tags", label: "Hashtags I follow" },
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

/** Groups the member belongs to, for "Post to" in the post window. */
async function myGroups(viewer: Awaited<ReturnType<typeof getViewer>>): Promise<{ id: string; name: string }[]> {
  if (!viewer.userId) return [];
  const { data } = await viewer.supabase.from("group_members").select("group:groups!inner(id, name, status)").eq("user_id", viewer.userId).eq("group.status", "active").limit(100);
  return ((data ?? []) as unknown as { group: { id: string; name: string } | null }[]).flatMap((r) => (r.group ? [{ id: r.group.id, name: r.group.name }] : []));
}

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
  // Speed: everything below depends only on who is signed in, so it is asked for at the same time, not one after another
  const [fs, tr] = await Promise.all([getHubSettings("feed"), getTagRules()]);
  const scopes = SCOPES.filter((x) => !x.key || (x.key === "tags" ? tr.on && tr.follow : (fs.filters as Record<string, boolean>)[x.key] !== false));
  const scope = viewer.userId && scopes.some((x) => x.key && x.key === params.scope) ? params.scope : undefined;
  const before = parseCursor(params.before);
  const followedP = scope === "tags" ? getMyTags(viewer.supabase, viewer.userId) : Promise.resolve([] as string[]);
  const postsP = followedP.then((followed) => {
    const aliases = followed.flatMap((t) => aliasesOf(t, tr.merge));
    return scope === "tags" && !aliases.length ? [] : fetchPosts(viewer.supabase, viewer.userId, {
      page,
      before,
      kind,
      savedBy: saved ? viewer.userId! : undefined,
      mine: scope === "mine",
      reactedBy: scope === "reacted" ? viewer.userId! : undefined,
      groupsOnly: scope === "groups",
      connectionsOnly: scope === "conn",
      followingOnly: scope === "follow",
      relevant: !!fs.relevant && !scope && !saved && !kind,
      tags: scope === "tags" ? aliases : undefined,
      limit: FEED.pageSize,
    });
  });
  const readyP = getMyReady().then(async (mine) => {
    const notReady = !!mine && mine.count < 5;
    const miss = notReady && mine ? missLine(mine.items, await getSignals(), { city: mine.city }) : null;
    const week = viewer.profile && !notReady ? await firstWeekSteps(viewer) : null;
    return { notReady, miss, week };
  });
  const [mayPost, followed, fetchedAll, { notReady, miss, week }, groups, businesses, rules, tagIndex] = await Promise.all([
    canStartPost(viewer.supabase, viewer.userId),
    followedP,
    postsP,
    readyP,
    myGroups(viewer),
    getPostingBusinesses(viewer.userId),
    getComposerRules(),
    tr.on && tr.auto ? getTagIndex(viewer.supabase) : Promise.resolve([]),
  ]);
  const fetched = scope === "tags" ? fetchedAll.filter((p) => extractTags(p.body, tr).some((t) => followed.includes(t))) : fetchedAll;
  const posts = latest || saved || before || scope ? fetched : topSignal(fetched);
  const keep = { kind, scope, sort: latest ? "latest" : undefined, saved: saved ? "1" : undefined };
  const last = fetched[fetched.length - 1];
  const older = fetched.length === FEED.pageSize && last ? `${last.created_at}_${last.id}` : null;

  return (
    <>
      {/* the handoff's order: stories, then the getting-started card, then the post box */}
      {!saved && !kind && page === 1 && !before && <Suspense fallback={null}><FeedStories /></Suspense>}
      {notReady && miss && !saved && !kind && page === 1 && <ReadyCard where="home" miss={miss} />}
      {week && !saved && !kind && page === 1 && <FirstWeek steps={week.steps} connections={week.count} />}
      {fs.refresh && <FeedRefresh />}
      {mayPost && viewer.profile && (
        <PostBox
          me={viewer.profile}
          initialKind={compose}
          groups={groups}
          businesses={businesses}
          rules={rules}
          tagRules={tr.on ? { per: tr.per, min: tr.min, max: tr.max, blocked: tr.blocked, removed: tr.removed, merge: tr.merge } : null}
          tagHints={tr.on && tr.auto ? tagIndex.slice(0, 60).map((t) => ({ tag: t.tag, uses: t.uses })) : undefined}
          initialText={params.tag && /^[a-z0-9_à-ſ]{2,40}$/i.test(params.tag) ? `#${params.tag.toLowerCase()} ` : params.text ? String(params.text).slice(0, 500) : undefined}
          free={!viewer.isStaff && !["plus", "advisor"].includes(String((viewer.profile as { plan?: string }).plan))}
          staff={viewer.isStaff}
        />
      )}

      {saved ? (
        <div className="tools"><h2 style={{ font: "700 15px var(--display)" }}>Saved bookmarks</h2></div>
      ) : (
        <FeedTools
          show={scopes.map((f) => ({ value: f.key || "all", label: f.label, href: href({ ...keep, scope: f.key || undefined }), on: (scope ?? "") === f.key }))}
          sort={[
            { value: "top", label: "Most useful", href: href({ ...keep, sort: undefined }), on: !latest },
            { value: "latest", label: "Latest", href: href({ ...keep, sort: "latest" }), on: latest },
          ]}
        />
      )}
      {(fs.topics || saved) && <nav className="chips" aria-label="Filter the feed">
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
      </nav>}

      {posts.length === 0 && (
        <Empty title={saved ? "No saved bookmarks yet" : kind ? `No ${KINDS[kind].label.toLowerCase()} posts yet` : "The feed is quiet"}>
          <p>{saved ? "Tap the bookmark on any post to keep it here." : "Switch back to Everything or share the first update with Canadian founders."}</p>
          {(saved || kind) && (
            <Link href="/feed" className="btn sm" style={{ alignSelf: "flex-start" }}>Reset filter</Link>
          )}
        </Empty>
      )}
      <AnimatedList className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} />
        ))}
      </AnimatedList>
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
