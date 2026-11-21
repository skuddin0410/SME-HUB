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
};


export type CommentRow = { id: string; body: string; created_at: string; author: Author };

export const MEMBER_TYPES: Record<Profile["member_type"], string> = {
  owner: "Business Owner",
  plus: "SMB Plus",
  elite: "SMB Elite",
  advisor: "SMB Advisor",
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

const POST_SELECT = `id, body, image_url, visibility, kind, created_at, pinned_at, group_id, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), group:groups!posts_group_id_fkey(name, slug), reactions(count), comments(count)`;

type Row = Omit<Post, "likes" | "comments" | "kinds" | "myReaction" | "reposts" | "reposted" | "link" | "counts" | "saved"> & {
  reactions: { count: number }[];
  comments: { count: number }[];
};

/** One page of posts. The database's security rules decide what this viewer may see. */
export async function fetchPosts(
  supabase: Supabase,
  userId: string | null,
  opts: { page?: number; groupId?: string; authorId?: string; postId?: string; search?: string; kind?: string; limit?: number; savedBy?: string } = {},
): Promise<Post[]> {
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.limit ?? PAGE_SIZE;

  // bookmarks: only posts this member saved (the table's rules show each member their own)
  let query = supabase.from("posts").select(opts.savedBy ? `${POST_SELECT}, saved_posts!inner(user_id)` : POST_SELECT);
  if (opts.savedBy) query = query.eq("saved_posts.user_id", opts.savedBy);
  // pinned posts lead the main feed only
  if (!opts.authorId && !opts.postId && !opts.search && !opts.kind && !opts.savedBy) {
    query = query.order("pinned_at", { ascending: false, nullsFirst: false });
  }
  query = query.order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
  if (opts.groupId) query = query.eq("group_id", opts.groupId);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.postId) query = query.eq("id", opts.postId);
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
  return rows.map((r) => {
    const e = extras.get(r.id);
    const likes = r.reactions[0]?.count ?? 0;
    return {
      ...r,
      link: links.get(r.author.id) ?? "none",
      likes,
      comments: r.comments[0]?.count ?? 0,
      kinds: e?.kinds?.length ? e.kinds : likes > 0 ? ["like"] : [],
      myReaction: userId ? (e?.my_kind ?? null) : null,
      reposts: e?.reposts ?? 0,
      reposted: !!userId && !!e?.reposted,
      counts: e?.counts ?? (likes > 0 ? { like: likes } : {}),
      saved: !!userId && !!e?.saved,
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
