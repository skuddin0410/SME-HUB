import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Profile = {
  id: string;
  full_name: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  avatar_url: string | null;
  member_type: "owner" | "plus" | "elite" | "advisor";
  role: "member" | "moderator" | "admin";
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
  group_id: string | null;
  author: Author;
  group: { name: string; slug: string } | null;
  likes: number;
  comments: number;
  likedByMe: boolean;
};

export type CommentRow = { id: string; body: string; created_at: string; author: Author };

export const MEMBER_TYPES: Record<Profile["member_type"], string> = {
  owner: "Business Owner",
  plus: "SMB Plus",
  elite: "SMB Elite",
  advisor: "SMB Advisor",
};

export const AUTHOR_FIELDS = "id, full_name, headline, avatar_url, member_type";
export const PAGE_SIZE = 12;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Whoever is looking at the page. Visitors get userId null. */
export async function getViewer() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  let profile: Profile | null = null;
  if (userId) {
    const res = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = res.data as Profile | null;
  }
  return { supabase, userId, profile, isStaff: !!profile && profile.role !== "member" };
}

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

const postSelect = (withPin: boolean) =>
  `id, body, image_url, visibility, created_at, ${withPin ? "pinned_at, " : ""}group_id, author:profiles!posts_author_id_fkey(${AUTHOR_FIELDS}), group:groups!posts_group_id_fkey(name, slug), reactions(count), comments(count)`;

type Row = Omit<Post, "likes" | "comments" | "likedByMe"> & {
  reactions: { count: number }[];
  comments: { count: number }[];
};

/** One page of posts. The database's security rules decide what this viewer may see. */
export async function fetchPosts(
  supabase: Supabase,
  userId: string | null,
  opts: { page?: number; groupId?: string; authorId?: string; postId?: string; search?: string; limit?: number } = {},
): Promise<Post[]> {
  const page = Math.max(1, opts.page ?? 1);
  const size = opts.limit ?? PAGE_SIZE;

  const run = (withPin: boolean) => {
    let query = supabase.from("posts").select(postSelect(withPin));
    if (withPin && !opts.authorId && !opts.postId && !opts.search) {
      query = query.order("pinned_at", { ascending: false, nullsFirst: false });
    }
    query = query.order("created_at", { ascending: false }).range((page - 1) * size, page * size - 1);
    if (opts.groupId) query = query.eq("group_id", opts.groupId);
    if (opts.authorId) query = query.eq("author_id", opts.authorId);
    if (opts.postId) query = query.eq("id", opts.postId);
    if (opts.search) query = query.ilike("body", `%${opts.search}%`);
    return query;
  };

  let { data, error } = await run(true);
  // 42703 = the pinned_at column is not there yet (migration 0003 not applied)
  if (error?.code === "42703") ({ data, error } = await run(false));
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  let liked = new Set<string>();
  if (userId) {
    const { data: mine } = await supabase
      .from("reactions")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", rows.map((r) => r.id));
    liked = new Set((mine ?? []).map((r) => r.post_id as string));
  }

  return rows.map((r) => ({
    ...r,
    pinned_at: r.pinned_at ?? null,
    likes: r.reactions[0]?.count ?? 0,
    comments: r.comments[0]?.count ?? 0,
    likedByMe: liked.has(r.id),
  }));
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
