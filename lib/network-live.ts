import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * "Your network, live": the signed-in member's connections on a map of Canada, and what those connections did that
 * involves the member. Everything is read with the member's own session, so the database's rules decide what shows:
 * only accepted connections, only posts the member may see, profile views only as the member's plan allows.
 */

export type LivePerson = {
  id: string;
  name: string;
  headline: string;
  avatar: string | null;
  location: string;
  type: string;
  since: string;
};

export type LiveKind = "react" | "comment" | "message" | "view" | "post" | "connect" | "booking" | "enquiry";

export type LiveEvent = {
  /** unique per event, so the list never shows one twice */
  key: string;
  kind: LiveKind;
  who: string;
  at: string;
  /** a few words after the name, e.g. "reacted to your post" */
  text: string;
  /** an optional quoted line, e.g. the post's title */
  quote?: string;
  href: string;
};

type Conn = { requester_id: string; addressee_id: string; created_at: string };

const NOTE: Record<string, [LiveKind, string]> = {
  like: ["react", "reacted to your post"],
  comment: ["comment", "commented on your post"],
  connection_accepted: ["connect", "accepted your invitation"],
  match_booked: ["booking", "booked a meeting with you"],
  advisor_booking: ["booking", "booked a free call with you"],
  sale_enquiry: ["enquiry", "asked about your business for sale"],
};

const short = (s: string | null | undefined, n = 70) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** The member's accepted connections, with what the map needs. */
export async function liveConnections(supabase: SupabaseClient, me: string): Promise<LivePerson[]> {
  const { data: links } = await supabase
    .from("connections")
    .select("requester_id, addressee_id, created_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .limit(1000);
  const rows = (links ?? []) as Conn[];
  const since = new Map(rows.map((r) => [r.requester_id === me ? r.addressee_id : r.requester_id, r.created_at]));
  const ids = [...since.keys()];
  if (!ids.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, headline, avatar_url, location, profile_type, status")
    .in("id", ids)
    .eq("status", "active");
  return ((data ?? []) as { id: string; full_name: string | null; headline: string | null; avatar_url: string | null; location: string | null; profile_type: string | null }[]).map((p) => ({
    id: p.id,
    name: p.full_name || "Member",
    headline: p.headline ?? "",
    avatar: p.avatar_url,
    location: p.location ?? "",
    type: p.profile_type ?? "owner",
    since: since.get(p.id) ?? "",
  }));
}

/**
 * What the member's connections did that involves the member (or, for posts, that the member can read), newest first.
 * `after` limits it to events after that moment, for the live updates.
 */
export async function liveEvents(supabase: SupabaseClient, me: string, people: Pick<LivePerson, "id" | "name">[], after?: string): Promise<LiveEvent[]> {
  const names = new Map(people.map((p) => [p.id, p.name]));
  const ids = [...names.keys()];
  if (!ids.length) return [];
  const from = after ?? new Date(Date.now() - 7 * 86400_000).toISOString();
  const [notes, msgs, posts, views] = await Promise.all([
    supabase.from("notifications").select("id, type, actor_id, post_id, created_at").eq("user_id", me).in("actor_id", ids).in("type", Object.keys(NOTE)).gt("created_at", from).order("created_at", { ascending: false }).limit(50),
    supabase.from("messages").select("id, sender_id, created_at").eq("recipient_id", me).in("sender_id", ids).gt("created_at", from).order("created_at", { ascending: false }).limit(40),
    supabase.from("posts").select("id, author_id, title, body, created_at").in("author_id", ids).gt("created_at", from).lte("created_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(30),
    supabase.rpc("my_profile_viewers"),
  ]);
  // the titles of the member's own posts that were reacted to or commented on
  const noteRows = (notes.data ?? []) as { id: string; type: string; actor_id: string; post_id: string | null; created_at: string }[];
  const postIds = [...new Set(noteRows.map((n) => n.post_id).filter(Boolean) as string[])];
  const titles = new Map<string, string>();
  if (postIds.length) {
    const { data } = await supabase.from("posts").select("id, title, body").in("id", postIds);
    for (const p of (data ?? []) as { id: string; title: string | null; body: string }[]) titles.set(p.id, short(p.title || p.body, 60));
  }
  const out: LiveEvent[] = [];
  for (const n of noteRows) {
    const [kind, text] = NOTE[n.type];
    out.push({ key: `n-${n.id}`, kind, who: n.actor_id, at: n.created_at, text, quote: n.post_id ? titles.get(n.post_id) : undefined, href: n.post_id ? `/posts/${n.post_id}` : `/members/${n.actor_id}` });
  }
  for (const m of (msgs.data ?? []) as { id: string; sender_id: string; created_at: string }[]) {
    out.push({ key: `m-${m.id}`, kind: "message", who: m.sender_id, at: m.created_at, text: "sent you a message", href: `/messages?with=${m.sender_id}` });
  }
  for (const p of (posts.data ?? []) as { id: string; author_id: string; title: string | null; body: string; created_at: string }[]) {
    out.push({ key: `p-${p.id}`, kind: "post", who: p.author_id, at: p.created_at, text: "posted", quote: short(p.title || p.body, 70), href: `/posts/${p.id}` });
  }
  for (const v of (views.data ?? []) as { viewer_id: string | null; last_at: string }[]) {
    if (!v.viewer_id || !names.has(v.viewer_id) || v.last_at <= from) continue;
    out.push({ key: `v-${v.viewer_id}-${v.last_at}`, kind: "view", who: v.viewer_id, at: v.last_at, text: "viewed your profile", href: `/members/${v.viewer_id}` });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 80);
}
