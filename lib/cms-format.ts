/** Pure helpers for the CMS: no server or browser imports, so they are unit tested directly. */

export const CMS_PAGE = 25;

/** Page number from the query string: whole, at least 1, at most 10,000. */
export function pageOf(value: string | undefined): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

/** The inclusive row range Supabase's .range() wants for a page. */
export function rangeOf(page: number, size = CMS_PAGE): [number, number] {
  return [(page - 1) * size, page * size - 1];
}

/** A link to the same list with some filters changed; empty values are dropped. */
export function withParams(path: string, params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && String(v) !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** Search text that is safe inside a PostgREST or() filter (no commas, brackets or wildcards). */
export function cleanSearch(value: string | undefined): string {
  return (value ?? "").replace(/[,()%*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "America/Toronto",
  });
}

/** "just now", "5m ago", "3h ago", "2d ago", then a date. */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return fmtDate(iso);
}

export type CmsEvent = {
  id: number;
  at: string;
  source: "hub" | "cms";
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  data: Record<string, unknown>;
};

const NOUN: Record<string, string> = {
  profiles: "member",
  posts: "post",
  comments: "comment",
  reactions: "reaction",
  reposts: "repost",
  saved_posts: "bookmark",
  connections: "connection",
  groups: "group",
  group_members: "group membership",
  group_invites: "group invite",
  companies: "business listing",
  company_reviews: "business review",
  messages: "message",
  reports: "report",
  blocks: "block",
  welcome_emails: "welcome email",
};

const row = (e: CmsEvent): Record<string, unknown> =>
  (e.action === "update" ? (e.data.row as Record<string, unknown>) : e.data) ?? {};
const changed = (e: CmsEvent): Record<string, { from: unknown; to: unknown }> =>
  (e.data.changed as Record<string, { from: unknown; to: unknown }>) ?? {};

/** One activity-log entry as a short sentence for the CMS feed. */
export function describeEvent(e: CmsEvent): string {
  const r = row(e);
  const noun = NOUN[e.entity] ?? e.entity.replace(/_/g, " ");
  if (e.source === "cms") {
    const name = typeof e.data.name === "string" && e.data.name ? ` ${e.data.name}` : "";
    return `Admin action: ${e.action.replace(".", " ")}${name}`;
  }
  if (e.action === "insert") {
    switch (e.entity) {
      case "profiles":
        return `New member joined${r.full_name ? `: ${r.full_name}` : ""}`;
      case "posts":
        return `New ${r.kind && r.kind !== "update" ? `${r.kind} ` : ""}post${r.group_id ? " in a group" : ""}`;
      case "reactions":
        return `Reacted ${r.kind === "love" ? "Insightful" : r.kind === "celebrate" ? "Celebrate" : "Helpful"} to a post`;
      case "connections":
        return "Sent a connection request";
      case "group_members":
        return "Joined a group";
      case "messages":
        return "Sent a direct message";
      case "reports":
        return `Reported ${r.post_id ? "a post" : "a member"}`;
      case "welcome_emails":
        return "Welcome email sent";
      case "saved_posts":
        return "Bookmarked a post";
      default:
        return `New ${noun}${typeof r.name === "string" ? `: ${r.name}` : ""}`;
    }
  }
  if (e.action === "delete") return `Deleted a ${noun}`;
  const c = changed(e);
  if (e.entity === "connections" && (c.status?.to as string) === "accepted") return "Accepted a connection request";
  if (e.entity === "messages" && c.read_at) return "Read a direct message";
  if (e.entity === "profiles" && c.status) return `Member ${c.status.to === "suspended" ? "suspended" : "reactivated"}`;
  if (e.entity === "profiles" && c.member_type) return `Plan changed to ${String(c.member_type.to)}`;
  if (e.entity === "profiles" && c.role) return `Role changed to ${String(c.role.to)}`;
  if (e.entity === "posts" && "pinned_at" in c) return c.pinned_at.to ? "Pinned a post" : "Unpinned a post";
  if (e.entity === "reports" && c.status) return `Report marked ${String(c.status.to)}`;
  const fields = Object.keys(c).filter((k) => k !== "updated_at");
  return `Updated a ${noun}${fields.length ? ` (${fields.slice(0, 3).join(", ")})` : ""}`;
}

/** Where an activity-log entry points in the CMS, when it has a page. */
export function eventHref(e: CmsEvent): string | null {
  const r = row(e);
  const id = (k: string) => (isUuid(r[k]) ? (r[k] as string) : null);
  if (e.action === "delete" && e.entity !== "reactions") return null;
  switch (e.entity) {
    case "profiles":
      return id("id") ? `/cms/members/${id("id")}` : null;
    case "posts":
      return id("id") ? `/cms/posts/${id("id")}` : null;
    case "comments":
    case "reactions":
    case "reposts":
    case "saved_posts":
      return id("post_id") ? `/cms/posts/${id("post_id")}` : null;
    case "groups":
      return id("id") ? `/cms/groups/${id("id")}` : null;
    case "group_members":
    case "group_invites":
      return id("group_id") ? `/cms/groups/${id("group_id")}` : null;
    case "companies":
      return "/cms/businesses";
    case "company_reviews":
      return "/cms/reviews";
    case "connections":
      return "/cms/connections";
    case "messages":
      return "/cms/messages";
    case "reports":
      return "/cms/reports";
    case "blocks":
      return "/cms/blocks";
    default:
      return null;
  }
}

/** The member an activity-log entry is mainly about (for the avatar beside it). */
export function eventPerson(e: CmsEvent): string | null {
  if (e.actor_id) return e.actor_id;
  const r = row(e);
  for (const k of ["author_id", "user_id", "requester_id", "sender_id", "owner_id", "reporter_id", "id"]) {
    if (isUuid(r[k]) && (k !== "id" || e.entity === "profiles")) return r[k] as string;
  }
  return null;
}

export const ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "profiles", label: "Members" },
  { value: "posts", label: "Posts" },
  { value: "comments", label: "Comments" },
  { value: "reactions", label: "Reactions" },
  { value: "reposts", label: "Reposts" },
  { value: "saved_posts", label: "Bookmarks" },
  { value: "connections", label: "Connections" },
  { value: "messages", label: "Messages" },
  { value: "groups", label: "Groups" },
  { value: "group_members", label: "Group members" },
  { value: "companies", label: "Businesses" },
  { value: "company_reviews", label: "Reviews" },
  { value: "reports", label: "Reports" },
  { value: "blocks", label: "Blocks" },
  { value: "welcome_emails", label: "Emails" },
];

/** A row from cms_users(): the profile plus sign-in details from auth. */
export type CmsUser = {
  id: string;
  email: string;
  full_name: string;
  headline: string;
  location: string;
  avatar_url: string | null;
  member_type: "owner" | "plus" | "elite" | "advisor";
  role: "member" | "admin";
  status: "active" | "suspended";
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string;
  posts: number;
  connections: number;
  total: number;
};

/**
 * Routing for the CMS subdomain (cms.smbhub.ca). On that host every page path is served from
 * app/cms, so "/" is the dashboard and "/members" is the members list; paths that already start
 * with /cms, and the shared /api, /auth, /_next and /brand paths, pass through unchanged.
 * Returns the path to rewrite to, or null to leave the request alone.
 */
export function cmsRewrite(host: string | null, path: string): string | null {
  const name = (host ?? "").toLowerCase().split(":")[0];
  if (!name.startsWith("cms.")) return null;
  if (path === "/cms" || path.startsWith("/cms/")) return null;
  if (/^\/(api|auth|_next|brand)(\/|$)/.test(path) || /\.[a-z0-9]{2,5}$/i.test(path)) return null;
  return path === "/" ? "/cms" : `/cms${path}`;
}
