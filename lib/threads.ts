import "server-only";
import { getViewer } from "@/lib/hub";

/** Update 42: weekly threads and group check-ins, read from the database (the schedule creates them at 8 am ET). */

export type Thread = {
  id: string; kind: "mon" | "wed" | "fri" | "group"; group_id: string | null; title: string; sub: string; rules: string[];
  host_id: string | null; advisors: string[]; opens_at: string; closes_at: string;
};
export type Person = { id: string; full_name: string | null; headline: string | null; avatar_url: string | null; member_type?: string | null };
export type Reply = {
  id: string; parent_id: string | null; body: string; is_host: boolean; is_advisor: boolean; helpful: number; created_at: string;
  author: Person | null; voted: boolean; answers: Reply[];
};

type DB = Awaited<ReturnType<typeof getViewer>>["supabase"];
const FIELDS = "id, kind, group_id, title, sub, rules, host_id, advisors, opens_at, closes_at";
const PERSON = "id, full_name, headline, avatar_url, member_type";

/** The three weekly threads people see now: this week's, or last week's until the new one opens. */
export async function currentWeekly(supabase: DB) {
  const { data, error } = await supabase.from("weekly_threads").select(FIELDS).in("kind", ["mon", "wed", "fri"]).lte("opens_at", new Date().toISOString()).order("opens_at", { ascending: false }).limit(6);
  if (error) return null; // migration 0078 not applied yet: the strip simply doesn't show
  const out: Partial<Record<"mon" | "wed" | "fri", Thread>> = {};
  for (const t of (data ?? []) as Thread[]) if (!out[t.kind as "mon"]) out[t.kind as "mon"] = t;
  return out;
}

/** Reply counts and up to 4 recent faces per thread. */
export async function threadStats(supabase: DB, ids: string[]) {
  const stats = new Map<string, { n: number; faces: Person[] }>();
  if (!ids.length) return stats;
  const { data } = await supabase.from("thread_replies").select(`thread_id, author:profiles!thread_replies_author_id_fkey(${PERSON})`).in("thread_id", ids).order("created_at", { ascending: false }).limit(2000);
  for (const r of (data ?? []) as unknown as { thread_id: string; author: Person | null }[]) {
    const s = stats.get(r.thread_id) ?? { n: 0, faces: [] };
    s.n += 1;
    if (r.author && s.faces.length < 4 && !s.faces.some((f) => f.id === r.author!.id)) s.faces.push(r.author);
    stats.set(r.thread_id, s);
  }
  return stats;
}

export async function people(supabase: DB, ids: string[]) {
  if (!ids.length) return new Map<string, Person>();
  const { data } = await supabase.from("profiles").select(PERSON).in("id", ids);
  return new Map(((data ?? []) as Person[]).map((p) => [p.id, p]));
}

/** "mon", "wed" or "fri": the latest of that kind; "g_<group slug>": that group's latest check-in; otherwise a thread id. */
export async function findThread(supabase: DB, key: string): Promise<{ thread: Thread; group: { id: string; slug: string; name: string } | null } | null> {
  let q = supabase.from("weekly_threads").select(FIELDS).lte("opens_at", new Date().toISOString()).order("opens_at", { ascending: false }).limit(1);
  type G = { id: string; slug: string; name: string };
  let group: G | null = null;
  if (["mon", "wed", "fri"].includes(key)) q = q.eq("kind", key);
  else if (key.startsWith("g_")) {
    const { data: g } = await supabase.from("groups").select("id, slug, name").eq("slug", key.slice(2)).maybeSingle();
    if (!g) return null;
    group = g as G;
    q = q.eq("kind", "group").eq("group_id", g.id);
  } else if (/^[0-9a-f-]{36}$/i.test(key)) q = q.eq("id", key);
  else return null;
  const { data } = await q.maybeSingle();
  if (!data) return null;
  const thread = data as Thread;
  if (thread.group_id && !group) {
    const { data: g } = await supabase.from("groups").select("id, slug, name").eq("id", thread.group_id).maybeSingle();
    group = (g as G | null) ?? null;
  }
  return { thread, group };
}

export async function threadReplies(supabase: DB, threadId: string, userId: string | null): Promise<Reply[]> {
  const { data } = await supabase
    .from("thread_replies")
    .select(`id, parent_id, body, is_host, is_advisor, helpful, created_at, author:profiles!thread_replies_author_id_fkey(${PERSON})`)
    .eq("thread_id", threadId)
    .is("hidden_at", null)
    .order("created_at", { ascending: true })
    .limit(1000);
  const rows = (data ?? []) as unknown as Omit<Reply, "voted" | "answers">[];
  const mine = new Set<string>();
  if (userId && rows.length) {
    const { data: v } = await supabase.from("thread_votes").select("reply_id").in("reply_id", rows.map((r) => r.id));
    for (const x of (v ?? []) as { reply_id: string }[]) mine.add(x.reply_id);
  }
  const all = rows.map((r) => ({ ...r, voted: mine.has(r.id), answers: [] as Reply[] }));
  const byId = new Map(all.map((r) => [r.id, r]));
  const top: Reply[] = [];
  for (const r of all) {
    if (r.parent_id && byId.has(r.parent_id)) byId.get(r.parent_id)!.answers.push(r);
    else if (!r.parent_id) top.push(r);
  }
  return top;
}
