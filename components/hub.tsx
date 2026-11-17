/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Lock, Pin, Trash2, UsersRound } from "lucide-react";
import { MEMBER_TYPES, timeAgo, type Author, type Post, type Profile } from "@/lib/hub";
import { acceptConnection, deletePost, removeConnection, requestConnection } from "@/app/(hub)/actions";
import { AvatarImg, PostActions, SubmitButton } from "@/components/hub-client";

export type Viewer = { userId: string | null; profile: Profile | null; isStaff: boolean };

export function TierBadge({ type }: { type: Profile["member_type"] }) {
  if (type === "owner") return null;
  const tone = {
    plus: "border border-foreground/20 text-foreground",
    elite: "bg-foreground text-white",
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
          <Link href={`/members/${person.id}`} className="truncate font-semibold leading-tight hover:underline">
            {person.full_name || "Member"}
          </Link>
          <TierBadge type={person.member_type} />
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{extra ?? (person.headline || "CanadianSME Hub member")}</p>
      </div>
    </div>
  );
}

const VISIBILITY_LABEL = { public: "", members: "Members only", connections: "Connections", private: "Only you" };

export function PostCard({ post, viewer, startOpen }: { post: Post; viewer: Viewer; startOpen?: boolean }) {
  const own = post.author.id === viewer.userId;
  return (
    <article className="panel overflow-hidden">
      {post.pinned_at && (
        <p className="flex items-center gap-1.5 border-b bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900">
          <Pin className="h-3.5 w-3.5" /> Pinned by CanadianSME
        </p>
      )}
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <PersonLine
          person={post.author}
          extra={
            <>
              {post.author.headline && <span className="hidden sm:inline">{post.author.headline}, </span>}
              <Link href={`/posts/${post.id}`} className="hover:underline">
                {timeAgo(post.created_at)}
              </Link>
              {post.group && (
                <>
                  {" in "}
                  <Link href={`/groups/${post.group.slug}`} className="font-medium text-foreground hover:underline">
                    {post.group.name}
                  </Link>
                </>
              )}
              {VISIBILITY_LABEL[post.visibility] && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 text-[11px]">
                  <Lock className="h-2.5 w-2.5" />
                  {VISIBILITY_LABEL[post.visibility]}
                </span>
              )}
            </>
          }
        />
        {(own || viewer.isStaff) && (
          <form action={deletePost.bind(null, post.id)}>
            <button
              type="submit"
              title="Delete post"
              aria-label="Delete post"
              className="press rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-primary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
      <p className="whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-relaxed">{post.body}</p>
      {post.image_url && <img src={post.image_url} alt="" loading="lazy" className="max-h-[520px] w-full object-cover" />}
      <PostActions
        postId={post.id}
        likes={post.likes}
        comments={post.comments}
        likedByMe={post.likedByMe}
        me={viewer.profile ? { id: viewer.profile.id, full_name: viewer.profile.full_name, avatar_url: viewer.profile.avatar_url } : null}
        isStaff={viewer.isStaff}
        ownPost={own}
        startOpen={startOpen}
      />
    </article>
  );
}

export type Link_ = { requester_id: string; status: "pending" | "accepted" } | null | undefined;

/** Connect / Accept / Pending / Connected, depending on where two members stand. */
export function ConnectControl({ viewer, otherId, link }: { viewer: Viewer; otherId: string; link: Link_ }) {
  if (viewer.userId === otherId) return null;
  if (!viewer.userId) {
    return (
      <Link href="/auth/login" className="press rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
        Connect
      </Link>
    );
  }
  if (!link) {
    return (
      <form action={requestConnection.bind(null, otherId)}>
        <SubmitButton>Connect</SubmitButton>
      </form>
    );
  }
  if (link.status === "pending" && link.requester_id === otherId) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        <form action={acceptConnection.bind(null, otherId)}>
          <SubmitButton>Accept</SubmitButton>
        </form>
        <form action={removeConnection.bind(null, otherId)}>
          <SubmitButton tone="outline">Decline</SubmitButton>
        </form>
      </div>
    );
  }
  return (
    <form action={removeConnection.bind(null, otherId)}>
      <SubmitButton tone="outline">{link.status === "accepted" ? "Connected" : "Request sent"}</SubmitButton>
    </form>
  );
}

export function GroupLine({ group }: { group: { slug: string; name: string; is_private: boolean; members: number } }) {
  return (
    <Link href={`/groups/${group.slug}`} className="group flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-white">
        <UsersRound className="h-5 w-5" />
      </span>
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
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
