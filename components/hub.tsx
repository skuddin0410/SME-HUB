/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { DEGREE_LABEL, MEMBER_TYPES, timeAgo, type Author, type Degree, type Post, type Profile } from "@/lib/hub";
import { getTagRules } from "@/lib/zip/hashtags-server";
import { AvatarImg, GroupLogo, PostActions, PostBody, PostMenu } from "@/components/hub-client";
import { getPostRules } from "@/lib/zip/settings-load";
import { TypeBadge } from "@/components/zip/type-badge";
import { PollView, PostManage, QuoteButton, QuoteEmbed } from "@/components/post-extras";
import { ConnectButton } from "@/components/network-client";
import { SaveButton } from "@/components/feed-client";
import { ZipAv } from "@/components/zip/bits";
import { PostMedia } from "@/components/zip/post-media";

export type Viewer = { userId: string | null; profile: Profile | null; isStaff: boolean };

/** Membership badge, as on posts in the design (docs/design/feed.html). */
export function TierBadge({ type, always = false }: { type: Profile["member_type"]; always?: boolean }) {
  if (type === "owner" && !always) return null;
  const tone = {
    owner: "bg-zinc-100 text-zinc-800 border-zinc-200",
    plus: "bg-white text-zinc-900 border-zinc-300",
    elite: "bg-blue-950 text-white border-blue-900",
    advisor: "bg-zinc-100 text-zinc-800 border-zinc-200",
  }[type];
  return <span className={`px-2 py-0.5 rounded-md text-[0.6562rem] font-semibold border ${tone}`}>{MEMBER_TYPES[type]}</span>;
}

export function PersonLine({ person, extra, size = 44, degree }: { person: Author; extra?: React.ReactNode; size?: number; degree?: Degree }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href={`/members/${person.id}`} className="shrink-0">
        <AvatarImg person={person} size={size} />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={`/members/${person.id}`} className="truncate text-sm font-semibold leading-tight hover:underline">
            {person.full_name || "Member"}
          </Link>
          {degree && <span className="text-xs text-muted-foreground">· {DEGREE_LABEL[degree]}</span>}
          <TierBadge type={person.member_type} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{extra ?? (person.headline || "SME Hub member")}</p>
      </div>
    </div>
  );
}

const VISIBILITY_LABEL = { public: "", members: "Members only", connections: "Connections", private: "Only you" };

/** One post in the feed (design: docs/design/feed.html). */
export async function PostCard({ post, viewer, startOpen }: { post: Post; viewer: Viewer; startOpen?: boolean }) {
  const rules = await getPostRules();
  const tr = await getTagRules();
  const own = post.author.id === viewer.userId;
  return (
    <article id={`post-${post.id}`} className={`card post${post.pinned_at ? " pinnedp" : ""}`}>
      {post.pinned_at && <p className="eyebrow">📌 Pinned by the Hub team</p>}
      <div className="row" style={{ alignItems: "flex-start" }}>
        {post.business ? (
          <Link href={`/businesses/${post.business.slug}`} className="shrink-0">
            {post.business.logo_url ? (
              <img src={post.business.logo_url} alt="" className="av bzav" />
            ) : (
              <span className="av bzav" aria-hidden="true">{post.business.name.charAt(0)}</span>
            )}
          </Link>
        ) : (
          <Link href={`/members/${post.author.id}`} style={{ display: "flex", flex: "none" }} aria-label={post.author.full_name || "Member"}>
            <ZipAv name={post.author.full_name || "Member"} src={post.author.avatar_url} />
          </Link>
        )}
        <div className="grow stack">
          <Link className="namebtn" href={post.business ? `/businesses/${post.business.slug}` : `/members/${post.author.id}`}>
            {post.business ? post.business.name : post.author.full_name || "Member"}
          </Link>
          <span className="muted small">
            {post.business ? (
              <>
                Business page · posted by <Link href={`/members/${post.author.id}`}>{post.author.full_name || "a team member"}</Link>
              </>
            ) : (
              post.author.headline || "SME Hub member"
            )}
          </span>
          {/* badges first, then when it was posted (and where); the post kind is not shown as a chip */}
          <span className="row phmeta" style={{ gap: 6, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
            {post.author.member_type === "advisor" && !post.business && <TypeBadge type="advisor" size="sm" />}
            {post.author.member_type !== "advisor" && post.author.member_type !== "owner" && !post.business && <TierBadge type={post.author.member_type} always />}
            <Link href={`/posts/${post.id}`} className="small" style={{ color: "#71717A" }}>
              {timeAgo(post.created_at)}
              {post.edited_at ? " · Edited" : ""}
            </Link>
            {post.group && (
              <Link href={`/groups/${post.group.slug}`} className="small" style={{ color: "#71717A" }}>
                · {post.group.name}
              </Link>
            )}
            {post.profile_pinned && <span className="tag">Pinned on profile</span>}
            {VISIBILITY_LABEL[post.visibility] && <span className="tag">{VISIBILITY_LABEL[post.visibility]}</span>}
          </span>
        </div>
        <div className="row" style={{ gap: 6, flex: "none" }}>
          {!own && !post.business && <ConnectButton otherId={post.author.id} initial={post.link} signedIn={!!viewer.userId} variant="text" />}
          <SaveButton postId={post.id} initial={post.saved} signedIn={!!viewer.userId} />
          <PostMenu postId={post.id} canDelete={own || viewer.isStaff} canReport={!own && !!viewer.userId} />
        </div>
      </div>
      {/* the cover shows only when the post has no photo or video of its own, so a picture never appears twice */}
      {post.cover_url && !(post.images.length > 0 || post.video_url || post.image_url) && (
        <div className="overflow-hidden rounded-xl border border-[#E5E5E8] bg-zinc-100">
          <img src={post.cover_url} alt="" loading="lazy" className="h-44 w-full object-cover" />
        </div>
      )}
      {post.title && <h3 className="font-display text-[1.125rem] font-bold leading-snug text-zinc-900">{post.title}</h3>}
      <PostBody text={post.body} tags={tr.on ? tr : null} />
      {post.quoted && <QuoteEmbed quoted={post.quoted} />}
      {post.poll && <PollView postId={post.id} poll={post.poll} signedIn={!!viewer.userId} />}
      {post.images.length > 0 || post.video_url ? (
        <PostMedia images={post.images} video={post.video_url} poster={post.video_poster} />
      ) : post.image_url && (
        <div className="rounded-xl overflow-hidden border border-[#E5E5E8] bg-zinc-100">
          <img src={post.image_url} alt="" loading="lazy" className="mx-auto block max-h-[21.25rem] w-auto max-w-full object-contain" />
        </div>
      )}
      {post.kind === "question" && post.comments === 0 && (
        <p className="small" style={{ fontWeight: 600, color: "var(--brand-ink)" }}>No answers yet. Can you help?</p>
      )}
      <PostActions
        postId={post.id}
        comments={post.comments}
        counts={post.counts}
        myReaction={post.myReaction}
        reposts={post.reposts}
        reposted={post.reposted}
        me={viewer.profile ? { id: viewer.profile.id, full_name: viewer.profile.full_name, avatar_url: viewer.profile.avatar_url } : null}
        isStaff={viewer.isStaff}
        startOpen={startOpen}
        commentsClosed={post.comments_closed}
        rules={rules}
        canQuote={!!(rules.share && post.id)}
      />
      {rules.share && viewer.userId && post.id && <QuoteButton postId={post.id} signedIn />}
      {own && <PostManage post={post} />}
    </article>
  );
}

export function GroupLine({ group }: { group: { slug: string; name: string; is_private: boolean; members: number } }) {
  return (
    <Link href={`/groups/${group.slug}`} className="group flex items-center gap-3">
      <GroupLogo seed={group.slug} name={group.name} size={44} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold group-hover:underline">{group.name}</span>
        <span className="block text-xs text-muted-foreground">
          {group.members} {group.members === 1 ? "member" : "members"}
          {group.is_private ? ", private" : ""}
        </span>
      </span>
    </Link>
  );
}

export function Pager({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  if (page === 1 && !hasMore) return null;
  const sep = base.includes("?") ? "&" : "?";
  const cls = "px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E5E5E8] bg-white text-zinc-800 hover:bg-[#F5F5F6] transition-colors";
  return (
    <div className="flex justify-between">
      {page > 1 ? (
        <Link href={`${base}${sep}page=${page - 1}`} className={cls}>
          Newer
        </Link>
      ) : (
        <span />
      )}
      {hasMore && (
        <Link href={`${base}${sep}page=${page + 1}`} className={cls}>
          Show older
        </Link>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="panel p-8 text-center space-y-2">
      <p className="font-display font-bold text-sm text-zinc-900">{title}</p>
      {children && <div className="mx-auto max-w-sm text-xs text-zinc-500">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display font-bold text-lg text-zinc-900">{title}</h1>
      {children}
    </div>
  );
}
