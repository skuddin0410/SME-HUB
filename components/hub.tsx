/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Lock, Pin } from "lucide-react";
import { DEGREE_LABEL, MEMBER_TYPES, timeAgo, type Author, type Degree, type Post, type Profile } from "@/lib/hub";
import { AvatarImg, GroupLogo, PostActions, PostBody, PostMenu } from "@/components/hub-client";
import { PollView, PostManage, QuoteButton, QuoteEmbed } from "@/components/post-extras";
import { ConnectButton } from "@/components/network-client";
import { SaveButton } from "@/components/feed-client";
import { KINDS } from "@/lib/demo";

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

const KIND_CHIP = {
  win: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  question: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  hiring: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800",
  intro: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  update: "bg-zinc-100 text-zinc-800 border-zinc-200",
} as const;

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
        <p className="truncate text-xs text-muted-foreground">{extra ?? (person.headline || "SMB Hub member")}</p>
      </div>
    </div>
  );
}

const VISIBILITY_LABEL = { public: "", members: "Members only", connections: "Connections", private: "Only you" };

/** One post in the feed (design: docs/design/feed.html). */
export function PostCard({ post, viewer, startOpen }: { post: Post; viewer: Viewer; startOpen?: boolean }) {
  const own = post.author.id === viewer.userId;
  const chip = "px-2 py-0.5 rounded-md text-[0.6562rem] font-semibold border";
  return (
    <article id={`post-${post.id}`} className="panel panel-hover p-4 sm:p-5 space-y-3.5 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {post.business ? (
            <Link href={`/businesses/${post.business.slug}`} className="shrink-0">
              {post.business.logo_url ? (
                <img src={post.business.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover ring-1 ring-[#E5E5E8]" />
              ) : (
                <span className="cover flex h-10 w-10 items-center justify-center rounded-lg text-base font-semibold text-white">{post.business.name.charAt(0)}</span>
              )}
            </Link>
          ) : (
            <Link href={`/members/${post.author.id}`} className="shrink-0 [&_img]:ring-[#E5E5E8]">
              <AvatarImg person={post.author} size={40} />
            </Link>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5">
              {post.business ? (
                <Link href={`/businesses/${post.business.slug}`} className="font-display font-bold text-[0.9375rem] text-zinc-900 truncate hover:underline">
                  {post.business.name}
                </Link>
              ) : (
                <Link href={`/members/${post.author.id}`} className="font-display font-bold text-[0.9375rem] text-zinc-900 truncate hover:underline">
                  {post.author.full_name || "Member"}
                </Link>
              )}
              {post.group && (
                <span className="text-xs text-zinc-500">
                  posted in{" "}
                  <Link href={`/groups/${post.group.slug}`} className="font-semibold text-zinc-800 hover:underline">
                    {post.group.name}
                  </Link>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 truncate">
              {post.business ? (
                <>
                  Business page · posted by{" "}
                  <Link href={`/members/${post.author.id}`} className="hover:underline">
                    {post.author.full_name || "a team member"}
                  </Link>
                </>
              ) : (
                post.author.headline || "SMB Hub member"
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Link href={`/posts/${post.id}`} className="text-[0.75rem] text-zinc-400 hover:underline">
                {timeAgo(post.created_at)}
              </Link>
              {!post.business && <TierBadge type={post.author.member_type} always />}
              {post.kind !== "update" && <span className={`${chip} ${KIND_CHIP[post.kind]}`}>{KINDS[post.kind].label}</span>}
              {post.edited_at && <span className="text-[0.75rem] text-zinc-400">(edited)</span>}
              {post.profile_pinned && (
                <span className={`${chip} bg-zinc-100 text-zinc-700 border-zinc-200 inline-flex items-center gap-1`}>
                  <Pin className="h-2.5 w-2.5" /> Pinned on profile
                </span>
              )}
              {post.pinned_at && (
                <span className={`${chip} bg-amber-50 text-amber-800 border-amber-200/80 inline-flex items-center gap-1`}>
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              {VISIBILITY_LABEL[post.visibility] && (
                <span className={`${chip} bg-white text-zinc-500 border-zinc-200 inline-flex items-center gap-1`}>
                  <Lock className="h-2.5 w-2.5" />
                  {VISIBILITY_LABEL[post.visibility]}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!own && !post.business && <ConnectButton otherId={post.author.id} initial={post.link} signedIn={!!viewer.userId} variant="text" />}
          <SaveButton postId={post.id} initial={post.saved} signedIn={!!viewer.userId} />
          <PostMenu postId={post.id} canDelete={own || viewer.isStaff} canReport={!own && !!viewer.userId} />
        </div>
      </div>
      {post.cover_url && (
        <div className="overflow-hidden rounded-xl border border-[#E5E5E8] bg-zinc-100">
          <img src={post.cover_url} alt="" loading="lazy" className="h-44 w-full object-cover" />
        </div>
      )}
      {post.title && <h3 className="font-display text-[1.125rem] font-bold leading-snug text-zinc-900">{post.title}</h3>}
      <PostBody text={post.body} />
      {post.quoted && <QuoteEmbed quoted={post.quoted} />}
      {post.poll && <PollView postId={post.id} poll={post.poll} signedIn={!!viewer.userId} />}
      {post.image_url && (
        <div className="rounded-xl overflow-hidden border border-[#E5E5E8] bg-zinc-100">
          <img src={post.image_url} alt="" loading="lazy" className="w-full max-h-[22.5rem] object-cover" />
        </div>
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
      />
      {viewer.userId && post.id && <QuoteButton postId={post.id} signedIn />}
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
