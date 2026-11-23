import type { Defaults } from "@/lib/zip/settings";

export type BlogRules = Defaults["blogs"];
export type BlockKind = "h" | "p" | "ul" | "q" | "img";
export type BlogBlock = [BlockKind, string];
export const BKINDS: Record<BlockKind, string> = { h: "Heading", p: "Paragraph", ul: "Bullet list", q: "Quote", img: "Image" };

export type BlogAuthor = { id: string; full_name: string; headline: string; avatar_url: string | null; location: string; bio: string };
export type MemberBlog = {
  id: string; author_id: string; title: string; cat: string; tags: string[]; image_url: string | null; blocks: BlogBlock[];
  status: "draft" | "review" | "scheduled" | "published" | "sent_back"; scheduled_at: string | null; published_at: string | null; created_at: string; author: BlogAuthor | null;
};

export const MB_SELECT = "id, author_id, title, cat, tags, image_url, blocks, status, scheduled_at, published_at, created_at, author:profiles!member_blogs_author_id_fkey(id, full_name, headline, avatar_url, location, bio)";

export const STATUS_LABEL: Record<MemberBlog["status"], string> = { draft: "Draft", review: "Waiting for approval", scheduled: "Scheduled", published: "Published", sent_back: "Sent back" };

export function readMinutes(blocks: BlogBlock[]) {
  const words = blocks.reduce((n, b) => n + (b[0] === "img" ? 0 : String(b[1]).split(/\s+/).filter(Boolean).length), 0);
  return `${Math.max(1, Math.round(words / 180))} min read`;
}

/** Who may write, from "Who can write a post". The team always can. */
export function canWrite(rules: BlogRules, plan: string | null | undefined, staff: boolean) {
  if (staff) return true;
  if (rules.who === "advisor") return plan === "advisor";
  if (rules.who === "paid") return plan === "plus" || plan === "advisor";
  return true;
}
/** Whether a post from this member waits for the team before it goes live. */
export function needsApproval(rules: BlogRules, plan: string | null | undefined, staff: boolean) {
  if (staff) return false;
  return rules.approve === "all" || (rules.approve === "free" && (!plan || plan === "free"));
}

export const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");

export function cleanBlocks(raw: unknown): BlogBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b): b is [string, string] => Array.isArray(b) && typeof b[0] === "string" && typeof b[1] === "string")
    .map(([k, v]) => [(k in BKINDS ? k : "p") as BlockKind, v.slice(0, 5000)] as BlogBlock)
    .filter(([, v]) => v.trim())
    .slice(0, 80);
}
