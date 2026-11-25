/** Community Stories: the shapes the browser gets, and the wording shared by server and browser (handoff: Stories). */

export type StoryAudience = "public" | "members" | "conn";
export type StoryStatus = "published" | "pending" | "removed" | "rejected";

export type StoryItem = { id: string; kind: "image" | "video"; poster: boolean };

export type StoryBiz = { id: string; name: string; slug: string; logo: string | null };

export type Story = {
  id: string;
  authorId: string;
  author: { name: string; avatar: string | null; biz: string };
  company: StoryBiz | null;
  caption: string;
  audience: StoryAudience;
  status: StoryStatus;
  publishedAt: string;
  items: StoryItem[];
  liked: boolean;
  /** item ids this viewer has already seen */
  seen: string[];
  mine: boolean;
  live: boolean;
};

/** One circle in the feed row: an author and their stories, oldest first. */
export type StoryAuthor = { id: string; name: string; avatar: string | null; unseen: boolean; latest: string; stories: Story[] };

export type StoryHighlight = { id: string; name: string; cover: string | null; items: { storyId: string; itemId: string }[] };

/** The parts of the team's Stories settings that the browser needs. */
export type StoryRules = {
  canPost: boolean;
  publish: "all" | "paid" | "team";
  approval: boolean;
  audiences: StoryAudience[];
  defAud: StoryAudience;
  hours: number;
  types: string[];
  maxMB: number;
  maxVid: number;
  perMember: number;
  perStory: number;
  likes: boolean;
  showViewers: boolean;
};

export const STTYPES: Record<string, [string, string]> = {
  jpg: ["image/jpeg", "JPG"], png: ["image/png", "PNG"], webp: ["image/webp", "WebP"], gif: ["image/gif", "GIF"],
  mp4: ["video/mp4", "MP4"], mov: ["video/quicktime", "MOV"], webm: ["video/webm", "WebM"],
};
export const AUDL: Record<StoryAudience, string> = { public: "Anyone, including visitors", members: "All Hub members", conn: "My connections only" };
export const AUDS: Record<StoryAudience, string> = { public: "Public", members: "Members", conn: "Connections" };
export const REPORT_REASONS = ["Spam or selling", "Misleading or false", "Harassment or hate", "Not suitable for a business community", "Something else"];

export function durLabel(hours: number) {
  return hours < 48 ? `${hours} hours` : `${hours / 24} days`;
}

/** "Just now", "12 min ago", "2 h ago", "3 days ago": the viewer's wording. */
export function stAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export const mediaUrl = (itemId: string, poster = false) => `/api/story-media/${itemId}${poster ? "?poster=1" : ""}`;

/** The extension a file is stored under, from its type (or its name when the browser does not say). */
export function storyExt(file: { type: string; name: string }): string | null {
  for (const [k, [mime]] of Object.entries(STTYPES)) if (file.type === mime) return k;
  const m = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (m === "jpeg") return "jpg";
  return m && m in STTYPES ? m : null;
}

/** Friendly words for the database's refusals (the "stories.x:" prefix names the setting). */
export function storyError(message: string) {
  const m = /stories(?:\.[a-zA-Z]+)?: (.*)$/.exec(message) ?? /highlights: (.*)$/.exec(message);
  if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1) + (/[.!?]$/.test(m[1]) ? "" : ".");
  return "That didn’t work. Check your connection and try again.";
}
