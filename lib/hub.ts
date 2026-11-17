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
  group_id: string | null;
  author: Author;
  group: { name: string; slug: string } | null;
  likes: number;
  comments: number;
  likedByMe: boolean;
};

export const MEMBER_TYPES: Record<Profile["member_type"], string> = {
  owner: "Small Business Owner",
  plus: "SMB Plus",
  elite: "SMB Elite",
  advisor: "SMB Advisor",
};

export const PAGE_SIZE = 15;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Signed-in user's id and profile; sends visitors to the login page. */
export async function getMe() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/auth/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return { supabase, userId, profile: profile as Profile | null };
}

const POST_SELECT =
  "id, body, image_url, visibility, created_at, group_id, author:profiles!posts_author_id_fkey(id, full_name, headline, avatar_url, member_type), group:groups!posts_group_id_fkey(name, slug), reactions(count), comments(count)";

type Row = Omit<Post, "likes" | "comments" | "likedByMe"> & {
  reactions: { count: number }[];
  comments: { count: number }[];
};

/** One page of posts. Row level security decides what this user may see. */
export async function fetchPosts(
  supabase: Supabase,
  userId: string,
  opts: { page?: number; groupId?: string; authorId?: string; postId?: string; feedOnly?: boolean } = {},
): Promise<Post[]> {
  const page = Math.max(1, opts.page ?? 1);
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (opts.groupId) query = query.eq("group_id", opts.groupId);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.postId) query = query.eq("id", opts.postId);
  if (opts.feedOnly) query = query.is("group_id", null);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const { data: mine } = await supabase
    .from("reactions")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", rows.map((r) => r.id));
  const liked = new Set((mine ?? []).map((r) => r.post_id as string));

  return rows.map((r) => ({
    ...r,
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
