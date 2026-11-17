/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Lock, Pin } from "lucide-react";
import { MEMBER_TYPES, timeAgo, type Author, type Post, type Profile } from "@/lib/hub";
import { AvatarImg, GroupLogo, PostActions, PostBody, PostMenu } from "@/components/hub-client";
import { ConnectButton } from "@/components/network-client";
import { KINDS } from "@/lib/demo";

export type Viewer = { userId: string | null; profile: Profile | null; isStaff: boolean };

export function TierBadge({ type }: { type: Profile["member_type"] }) {
  if (type === "owner") return null;
  const tone = {
    plus: "border border-foreground/20 text-foreground",
    elite: "bg-[hsl(var(--ink))] text-white",
    advisor: "bg-amber-100 text-amber-900",
  }[type];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{MEMBER_TYPES[type]}</span>;
}

export function PersonLine({ person, extra, size = 44 }: { person: Author; extra?: React.ReactNode; size?: number }) {
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
          <TierBadge type={person.member_type} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{extra ?? (person.headline || "SMB Hub member")}</p>
      </div>
    </div>
  );
}

const VERB = { update: "posted an update", question: "asked a question", win: "shared a win", offer: "posted an offer", hiring: "is hiring" };
const VISIBILITY_LABEL = { public: "", members: "Members only", connections: "Connections", private: "Only you" };

export function PostCard({ post, viewer, startOpen }: { post: Post; viewer: Viewer; startOpen?: boolean }) {
  const own = post.author.id === viewer.userId;
  return (
    <article id={`post-${post.id}`} className="panel">
      {post.pinned_at && (
        <p className="flex items-center gap-1.5 rounded-t-lg border-b bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900">
          <Pin className="h-3.5 w-3.5" /> Pinned by SMB Hub
        </p>
      )}
      <div className="flex items-start justify-between gap-2 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={`/members/${post.author.id}`} className="shrink-0">
            <AvatarImg person={post.author} size={48} />
          </Link>
          <div className="min-w-0">
            <p className="text-sm leading-snug">
              <Link href={`/members/${post.author.id}`} className="font-semibold hover:underline">
                {post.author.full_name || "Member"}
              </Link>{" "}
              <span className="text-muted-foreground">{VERB[post.kind]}</span>
              {post.group && (
                <>
                  <span className="text-muted-foreground"> in </span>
                  <Link href={`/groups/${post.group.slug}`} className="font-semibold hover:underline">
                    {post.group.name}
                  </Link>
                </>
              )}
            </p>
            {post.author.headline && <p className="truncate text-xs text-muted-foreground">{post.author.headline}</p>}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Link href={`/posts/${post.id}`} className="hover:underline">
                {timeAgo(post.created_at)}
              </Link>
              <TierBadge type={post.author.member_type} />
              {post.kind !== "update" && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KINDS[post.kind].chip}`}>{KINDS[post.kind].label}</span>
              )}
              {VISIBILITY_LABEL[post.visibility] && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 text-[11px]">
                  <Lock className="h-2.5 w-2.5" />
                  {VISIBILITY_LABEL[post.visibility]}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          {!own && <ConnectButton otherId={post.author.id} initial={post.link} signedIn={!!viewer.userId} variant="text" />}
          <PostMenu postId={post.id} canDelete={own || viewer.isStaff} canReport={!own && !!viewer.userId} />
        </div>
      </div>
      <PostBody text={post.body} />
      {post.image_url && <img src={post.image_url} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />}
      <PostActions
        postId={post.id}
        likes={post.likes}
        comments={post.comments}
        likedByMe={post.likedByMe}
        me={viewer.profile ? { id: viewer.profile.id, full_name: viewer.profile.full_name, avatar_url: viewer.profile.avatar_url } : null}
        isStaff={viewer.isStaff}
        startOpen={startOpen}
      />
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
  const cls = "press rounded-full border border-input bg-white px-4 py-2 text-sm font-semibold hover:bg-muted";
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
    <div className="panel px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
