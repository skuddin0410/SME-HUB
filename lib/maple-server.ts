import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AskSource } from "@/lib/ask";
import type { MapleAnswer, MaplePerson, MaplePost } from "@/supabase/functions/_shared/maple-rules";
import type { MapleMsg, MapleLeft, MapleSettings } from "@/lib/maple";

/**
 * Updates 46 to 48: Maple on the Hub's server. The answering itself runs in the maple-ask Edge Function
 * (Supabase + Amazon Bedrock, keys kept in Supabase). Until that is deployed, or if it can't be reached,
 * the Hub answers with the same step-1 rules and the earlier "Ask the Hub" engine, so nothing breaks.
 */

const NOT_THERE = /maple_|relation .* does not exist|schema cache|function .* does not exist|could not find/i;

/** The member's Maple settings, or null before migration 0081. */
export async function mapleSettings(supabase: SupabaseClient, userId: string): Promise<MapleSettings | null> {
  const { data, error } = await supabase.from("maple_settings").select("enabled, use_profile, show_tips").eq("user_id", userId).maybeSingle();
  if (error) return null;
  return { on: data?.enabled ?? true, personal: data?.use_profile ?? true, tips: data?.show_tips ?? true };
}

/** Questions used this month and the allowance (limit null = none, for the Hub team). */
export async function mapleLeft(supabase: SupabaseClient): Promise<MapleLeft> {
  const m = await supabase.rpc("maple_left");
  if (!m.error && m.data) return m.data as MapleLeft;
  const h = await supabase.rpc("hub_ai_left");
  const l = (h.data as MapleLeft | null) ?? null;
  return { used: l?.used ?? 0, limit: l ? (l.limit ?? null) : 10 };
}

type Row = { id: number; role: "member" | "maple"; body: string; route: string | null; meta: { a?: MapleAnswer; ai?: boolean } | null; feedback: number | null; created_at: string };
type AskRow = { id: string; question: string; answer: string; sources: AskSource | null; created_at: string };

/** The member's chat, oldest first (the last 40 messages), and whether the Maple tables are there. */
export async function mapleHistory(supabase: SupabaseClient, userId: string): Promise<{ msgs: MapleMsg[]; ready: boolean }> {
  const { data, error } = await supabase.from("maple_messages").select("id, role, body, route, meta, feedback, created_at").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(40);
  if (!error) {
    const rows = ((data ?? []) as Row[]).reverse();
    const msgs: MapleMsg[] = [];
    let lastQ = "";
    for (const r of rows) {
      if (r.role === "member") {
        lastQ = r.body;
        msgs.push({ id: `q${r.id}`, by: "me", t: r.body, at: r.created_at });
      } else {
        const a = r.meta?.a ?? { t: [r.body] };
        msgs.push({ id: String(r.id), by: "maple", t: r.body, a, q: r.route === "limit" ? undefined : lastQ, fb: (r.feedback ?? 0) as MapleMsg["fb"], ai: !!r.meta?.ai, at: r.created_at });
      }
    }
    return { msgs, ready: true };
  }
  // before migration 0081: the earlier "Ask the Hub" history
  const old = await supabase.from("ai_asks").select("id, question, answer, sources, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  const msgs: MapleMsg[] = [];
  for (const r of ((old.data ?? []) as AskRow[]).reverse()) {
    msgs.push({ id: `q${r.id}`, by: "me", t: r.question, at: r.created_at });
    msgs.push({ id: `old-${r.id}`, by: "maple", t: r.answer, a: legacyAnswer(r.question, r.answer, r.sources), q: r.question, ai: !!r.answer, at: r.created_at });
  }
  return { msgs, ready: false };
}

/** An earlier "Ask the Hub" answer, shown the Maple way. */
export function legacyAnswer(q: string, answer: string, s: AskSource | null): MapleAnswer {
  const posts: MaplePost[] = (s?.posts ?? []).filter((p) => p.author.id).slice(0, 2).map((p) => ({ id: p.id, name: p.author.name, avatar: p.author.avatar, authorId: p.author.id, reply: !!p.about, role: p.author.role, text: p.text }));
  const people: MaplePerson[] = (s?.members ?? []).slice(0, 3).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, sub: m.helps, advisor: false }));
  const t = answer.trim() ? answer.trim().split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean) : [people.length || posts.length ? "Here’s what members have shared and who can help." : "I don’t have a solid answer for that yet, and I’d rather not guess. Two good next steps:"];
  return { t, posts, people, acts: [["Ask the community", "ask", q]] };
}

/** Calls one of Maple's Edge Functions with the member's own sign-in token. Null when it isn't deployed or can't be reached. */
export async function mapleEdge<T>(supabase: SupabaseClient, name: "maple-ask" | "maple-admin", body: unknown, timeoutMs = 25_000): Promise<{ status: number; data: T } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return null;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: "POST",
      signal: ctl.signal,
      cache: "no-store",
      headers: { "content-type": "application/json", apikey: key, authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.status === 404) return null; // not deployed yet
    const data = (await res.json().catch(() => null)) as T | null;
    if (data === null) return res.status >= 500 ? null : { status: res.status, data: {} as T };
    return { status: res.status, data };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const SPAM = /(!!!|guaranteed|#free|#cheap|followers in)/i;

/** Fills in the people and community replies an answer asks for, only from what members made visible. */
export async function mapleEnrich(supabase: SupabaseClient, userId: string, q: string, a: MapleAnswer, found: AskSource): Promise<MapleAnswer> {
  const out: MapleAnswer = { ...a, acts: (a.acts ?? []).map(([l, k, x]) => [l, k, x === "@me" ? `/members/${userId}` : x]) };
  const need = a.need;
  delete out.need;
  if (!need && !a.kind) return out;
  const posts: MaplePost[] = found.posts
    .filter((p) => p.author.id && p.author.id !== userId && !SPAM.test(p.text))
    .map((p) => ({ id: p.id, name: p.author.name, avatar: p.author.avatar, authorId: p.author.id, reply: !!p.about, role: p.author.role, text: p.text }));
  let people: MaplePerson[] = [];
  if (need?.members) {
    let ms = found.members.filter((m) => m.id !== userId);
    if (need.members.match && ms.length) {
      const { data: d } = await supabase.rpc("get_profile_details", { p_ids: ms.map((m) => m.id) });
      const helps = new Map(((d ?? []) as { user_id: string; helps_with: string[] }[]).map((x) => [x.user_id, x.helps_with ?? []]));
      const re = new RegExp(need.members.match, "i");
      ms = ms.filter((m) => re.test((helps.get(m.id) ?? []).join(" ")));
    }
    people = await describe(supabase, ms.slice(0, need.members.n).map((m) => m.id));
  }
  if (need?.advisors && (!need.members || !people.length)) people = await advisors(supabase, userId, need.advisors.n, need.advisors.kw);
  if (a.kind === "people") {
    out.t = [people.length ? "Here are members who say they can help with that. Message them, or ask a shared connection for a warm introduction." : "I couldn’t find a member who lists that yet."];
  }
  out.people = people;
  // a reply from someone already listed under "people" isn't shown twice
  const shown = new Set(people.map((p) => p.id));
  out.posts = posts.filter((p) => !shown.has(p.authorId)).slice(0, need?.posts ?? 0);
  delete out.kind;
  return out;
}

type PRow = { id: string; full_name: string | null; avatar_url: string | null; headline: string | null; location: string | null; profile_type: string | null; plan: string | null };

/** Name, photo and "what they help with · city" for members, keeping the order given. */
async function describe(supabase: SupabaseClient, ids: string[]): Promise<MaplePerson[]> {
  if (!ids.length) return [];
  const [{ data: ps }, { data: ds }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, headline, location, profile_type, plan").in("id", ids).eq("status", "active"),
    supabase.rpc("get_profile_details", { p_ids: ids }),
  ]);
  const pm = new Map(((ps ?? []) as PRow[]).map((p) => [p.id, p]));
  const dm = new Map(((ds ?? []) as { user_id: string; helps_with: string[] }[]).map((d) => [d.user_id, d.helps_with ?? []]));
  return ids.flatMap((id) => {
    const p = pm.get(id);
    if (!p) return [];
    const helps = dm.get(id) ?? [];
    const city = (p.location ?? "").trim();
    return [{ id, name: p.full_name || "A member", avatar: p.avatar_url, sub: `${helps.length ? helps.join(", ") : p.headline ?? ""}${city ? ` · ${city}` : ""}`.replace(/^ · /, ""), advisor: p.profile_type === "advisor" || p.plan === "advisor" }];
  });
}

/** SME Advisors matched to the topic: the ones whose "can help with" and headline share the most words. */
async function advisors(supabase: SupabaseClient, userId: string, n: number, kw: string[] = []): Promise<MaplePerson[]> {
  const { data } = await supabase.rpc("search_members", { q: "", p_type: "advisor", p_limit: 60 });
  type A = { id: string; headline: string | null; helps_with: string[] | null };
  let scored = ((data ?? []) as A[])
    .filter((m) => m.id !== userId)
    .map((m) => {
      const t = `${(m.helps_with ?? []).join(" ")} ${m.headline ?? ""}`.toLowerCase();
      return { id: m.id, sc: kw.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0) };
    })
    .sort((x, y) => y.sc - x.sc);
  if (kw.length && scored.length && scored[0].sc > 0) scored = scored.filter((x) => x.sc > 0);
  return (await describe(supabase, scored.slice(0, n).map((x) => x.id))).map((p) => ({ ...p, advisor: true }));
}

export const mapleMissing = (message: string) => NOT_THERE.test(message);
