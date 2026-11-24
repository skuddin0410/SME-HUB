import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { ReactionKind } from "@/lib/reactions";

export type Profile = {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string | null;
  member_type: "owner" | "plus" | "elite" | "advisor";
  role: "member" | "admin";
  status: "active" | "suspended";
  created_at: string;
};

export type Author = Pick<Profile, "id" | "full_name" | "headline" | "avatar_url" | "member_type">;

export type Post = {
  id: string;
  body: string;
  image_url: string | null;
  visibility: "public" | "members" | "connections" | "private";
  created_at: string;
  pinned_at: string | null;
  kind: "update" | "question" | "win" | "offer" | "hiring" | "intro";
  group_id: string | null;
  author: Author;
  business: { id: string; name: string; slug: string; logo_url: string | null } | null;
  group: { name: string; slug: string } | null;
  likes: number;
  comments: number;
  /** which reactions the post has, and the viewer's own */
  kinds: ReactionKind[];
  myReaction: ReactionKind | null;
  reposts: number;
  reposted: boolean;
  /** how many of each reaction (Helpful, Insightful, Celebrate) */
  counts: Partial<Record<ReactionKind, number>>;
  /** the viewer bookmarked it */
  saved: boolean;
  link: LinkState;
  title: string;
  cover_url: string | null;
  edited_at: string | null;
  comments_closed: boolean;
  profile_pinned: boolean;
  status: "published" | "scheduled";
  scheduled_at: string | null;
  quoted: QuotedPost | null;
  poll: PollData | null;
  /** Update 10: up to 10 photos (the first is also image_url) and 1 video with its poster picture */
  images: string[];
  video_url: string | null;
  video_poster: string | null;
};

export type QuotedPost = { id: string; body: string; title: string; created_at: string; author: Pick<Author, "id" | "full_name" | "avatar_url"> };
export type PollData = { closesAt: string; options: { id: string; label: string; votes: number }[]; myVote: string | null };


export type CommentRow = { id: string; body: string; created_at: string; edited_at: string | null; parent_id: string | null; author: Author };

export const MEMBER_TYPES: Record<Profile["member_type"], string> = {
  owner: "Business Owner",
  plus: "SMB Plus",
  elite: "SMB Elite",
  advisor: "SME Advisor",
};

export const AUTHOR_FIELDS = "id, full_name, headline, avatar_url, member_type";
export const PAGE_SIZE = 20;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Where the viewer stands with another member. */
export type LinkState = "none" | "sent" | "received" | "connected";

/** Whoever is looking at the page. Visitors get userId null. Asked once per request, however many layouts and pages call it. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  let profile: Profile | null = null;
  if (userId) {
    const res = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = res.data as Profile | null;
  }
  return { supabase, userId, profile, isStaff: !!profile && profile.role !== "member" };
});

/** The viewer's connection state with every member they have a link to. */
export const getLinks = cache(async (): Promise<Map<string, LinkState>> => {
  const { supabase, userId } = await getViewer();
  const map = new Map<string, LinkState>();
  if (!userId) return map;
  const { data } = await supabase.from("connections").select("requester_id, addressee_id, status");
  for (const r of data ?? []) {
    const mine = r.requester_id === userId;
    map.set(mine ? r.addressee_id : r.requester_id, r.status === "accepted" ? "connected" : mine ? "sent" : "received");
  }
  return map;
});

/** For pages and actions that need an account. Sends visitors to sign in. */
export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/auth/login");
  return { ...viewer, userId: viewer.userId };
}

/** For the admin area. */
export async function requireStaff() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/admin/login");
  if (!viewer.isStaff) redirect("/admin/login?denied=1");
  return { ...viewer, userId: viewer.userId, profile: viewer.profile as Profile };
}

const POST_SELECT = `id, body, image_url, images, video_url, video_poster, visibility, kind, created_at, pinned_at, group_id, title, cover_url, edited_at, comments_closed, profile_pinned, status, scheduled_at, quoted_post_id, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), business:companies!posts_business_id_fkey(id, name, slug, logo_url), group:groups!posts_group_id_fkey(name, slug), reactions(count), comments(count)`;

type Row = Omit<Post, "likes" | "comments" | "kinds" | "myReaction" | "reposts" | "reposted" | "link" | "counts" | "saved" | "quoted" | "poll"> & {
  quoted_post_id: string | null;
  reactions: { count: number }[];
  comments: { count: number }[];
};

/** One page of posts. The database's security rules decide what this viewer may see. */
export async function fetchPosts(
  supabase: Supabase,
  userId: string | null,
  opts: { page?: number; before?: { createdAt: string; id: string }; mine?: boolean; reactedBy?: string; groupsOnly?: boolean; connectionsOnly?: boolean; followingOnly?: boolean; scheduledBy?: string; groupId?: string; authorId?: string; postId?: string; search?: string; kind?: string; limit?: number; savedBy?: string; businessId?: string; relevant?: boolean; tags?: string[] } = {},
): Promise<Post[]> {
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.limit ?? PAGE_SIZE;

  // bookmarks: only posts this member saved (the table's rules show each member their own)
  // the feed only shows published posts; an author's own scheduled posts are listed on their own page
  let query = supabase.from("posts").select(opts.savedBy ? `${POST_SELECT}, saved_posts!inner(user_id)` : POST_SELECT);
  if (opts.savedBy) query = query.eq("saved_posts.user_id", opts.savedBy);
  // pinned posts lead the main feed only
  if (!opts.authorId && !opts.postId && !opts.search && !opts.kind && !opts.savedBy && !opts.tags) {
    query = query.order("pinned_at", { ascending: false, nullsFirst: false });
  }
  // on a member's profile, the post they pinned comes first
  if (opts.authorId && !opts.before && (opts.page ?? 1) === 1) query = query.order("profile_pinned", { ascending: false });
  query = opts.scheduledBy
    ? query.eq("status", "scheduled").eq("author_id", opts.scheduledBy).order("scheduled_at", { ascending: true }).limit(size)
    : query.eq("status", "published").order("created_at", { ascending: false }).order("id", { ascending: false });
  if (!opts.scheduledBy) {
    // cursor paging (stable while new posts arrive) when given, page numbers otherwise
    if (opts.before) query = query.or(`created_at.lt.${opts.before.createdAt},and(created_at.eq.${opts.before.createdAt},id.lt.${opts.before.id})`).limit(size);
    else query = query.range((page - 1) * size, page * size - 1);
  }
  if (opts.mine && userId) query = query.eq("author_id", userId);
  if (userId && (opts.reactedBy || opts.connectionsOnly || opts.followingOnly)) {
    if (opts.reactedBy) {
      const { data: r } = await supabase.from("reactions").select("post_id").eq("user_id", userId).limit(500);
      query = query.in("id", (r ?? []).map((x) => x.post_id as string));
    } else if (opts.connectionsOnly) {
      const links = await getLinks();
      query = query.in("author_id", [...links].filter(([, v]) => v === "connected").map(([k]) => k));
    } else {
      const { data: f } = await supabase.from("follows").select("followee_id").eq("follower_id", userId).limit(500);
      query = query.in("author_id", (f ?? []).map((x) => x.followee_id as string));
    }
  }
  if (userId && opts.relevant) {
    // posts from me, my connections, people I follow, and my groups; nothing hidden or ranked
    const [{ data: f }, { data: g }] = await Promise.all([
      supabase.from("follows").select("followee_id").eq("follower_id", userId).limit(500),
      supabase.from("group_members").select("group_id").eq("user_id", userId).limit(200),
    ]);
    const links = await getLinks();
    const authors = [userId, ...[...links].filter(([, v]) => v === "connected").map(([k]) => k), ...(f ?? []).map((x) => x.followee_id as string)];
    const groups = (g ?? []).map((x) => x.group_id as string);
    query = query.or(`author_id.in.(${authors.join(",")})${groups.length ? `,group_id.in.(${groups.join(",")})` : ""}`);
  }
  if (opts.groupsOnly) query = query.not("group_id", "is", null);
  if (opts.groupId) query = query.eq("group_id", opts.groupId);
  if (opts.businessId) query = query.eq("business_id", opts.businessId);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.postId) query = query.eq("id", opts.postId);
  // hashtags: a rough match in the database; the screen then keeps only posts that really use the tag
  if (opts.tags?.length) query = query.or(opts.tags.filter((t) => /^[a-zà-ſ0-9_]+$/i.test(t)).map((t) => `body.ilike.%#${t}%`).join(","));
  if (opts.kind) query = query.eq("kind", opts.kind);
  const fts = opts.search ? ftsQuery(opts.search) : "";
  if (fts) query = query.textSearch("fts", fts, { config: "english" });

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  // reaction kinds, the viewer's own reaction and reposts; posts still render if this call fails
  type Extra = { post_id: string; kinds: ReactionKind[]; my_kind: ReactionKind | null; reposts: number; reposted: boolean; counts?: Partial<Record<ReactionKind, number>>; saved?: boolean };
  const { data: extraRows } = await supabase.rpc("post_extras", { ids: rows.map((r) => r.id) });
  const extras = new Map(((extraRows ?? []) as Extra[]).map((e) => [e.post_id, e]));

  const links = await getLinks();

  // quoted posts and polls, fetched together for the whole page
  const quotedIds = [...new Set(rows.map((r) => r.quoted_post_id).filter((x): x is string => !!x))];
  const quotedMap = new Map<string, QuotedPost>();
  if (quotedIds.length) {
    const { data: q } = await supabase.from("posts").select(`id, body, title, created_at, author:profiles!posts_author_id_fkey(id, full_name, avatar_url)`).in("id", quotedIds);
    for (const x of (q ?? []) as unknown as QuotedPost[]) quotedMap.set(x.id, x);
  }
  const ids = rows.map((r) => r.id);
  const { data: pollRows } = await supabase.from("polls").select("post_id, closes_at, poll_options(id, label, votes, position)").in("post_id", ids);
  const pollMap = new Map<string, PollData>();
  if (pollRows?.length) {
    const mine = userId ? await supabase.from("poll_votes").select("post_id, option_id").in("post_id", ids) : { data: [] };
    const myVotes = new Map(((mine.data ?? []) as { post_id: string; option_id: string }[]).map((v) => [v.post_id, v.option_id]));
    for (const p of pollRows as unknown as { post_id: string; closes_at: string; poll_options: { id: string; label: string; votes: number; position: number }[] }[]) {
      pollMap.set(p.post_id, { closesAt: p.closes_at, options: [...p.poll_options].sort((a, b) => a.position - b.position).map(({ id, label, votes }) => ({ id, label, votes })), myVote: myVotes.get(p.post_id) ?? null });
    }
  }
  return rows.map((r) => {
    const e = extras.get(r.id);
    const likes = r.reactions[0]?.count ?? 0;
    return {
      ...r,
      images: r.images ?? [],
      video_url: r.video_url ?? null,
      video_poster: r.video_poster ?? null,
      link: links.get(r.author.id) ?? "none",
      likes,
      comments: r.comments[0]?.count ?? 0,
      kinds: e?.kinds?.length ? e.kinds : likes > 0 ? ["like"] : [],
      myReaction: userId ? (e?.my_kind ?? null) : null,
      reposts: e?.reposts ?? 0,
      reposted: !!userId && !!e?.reposted,
      counts: e?.counts ?? (likes > 0 ? { like: likes } : {}),
      saved: !!userId && !!e?.saved,
      quoted: r.quoted_post_id ? (quotedMap.get(r.quoted_post_id) ?? null) : null,
      poll: pollMap.get(r.id) ?? null,
    };
  });
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Removes characters that have meaning in Supabase filter strings. */
export function cleanTerm(q: string) {
  return q.replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
}

/**
 * Turns what someone typed into a Postgres full-text query: every word must match, and each word
 * also matches longer words that start with it ("dan logi" finds "Daniel ... Logistics").
 * Only letters and digits survive, so the result is always valid query syntax.
 */
export function ftsQuery(q: string) {
  return (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .slice(0, 8)
    .map((w) => `${w}:*`)
    .join(" & ");
}

export type Degree = 1 | 2 | 3;
export const DEGREE_LABEL: Record<Degree, string> = { 1: "1st", 2: "2nd", 3: "3rd+" };

/** The signed-in member's distance to each of these members. Empty for visitors. */
export async function getDegrees(supabase: Supabase, userId: string | null, ids: string[]) {
  const map = new Map<string, Degree>();
  if (!userId || ids.length === 0) return map;
  const { data } = await supabase.rpc("connection_degrees", { ids });
  for (const row of (data ?? []) as { id: string; degree: Degree }[]) map.set(row.id, row.degree);
  return map;
}
