"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { findSources, writeAnswer } from "@/lib/ask-server";
import { serviceClient } from "@/lib/supabase/service";
import { legacyAnswer, mapleEdge, mapleEnrich, mapleHistory, mapleLeft, mapleMissing, mapleSettings } from "@/lib/maple-server";
import type { MapleLeft, MapleMsg, MapleSettings } from "@/lib/maple";
import { mapleHubAnswer, mapleLimit, mapleUnknown, type MapleAnswer, type MapleCtx } from "@/supabase/functions/_shared/maple-rules";

/** Updates 46 to 48: Maple, SME Hub's AI assistant. Everything a member does with Maple goes through here. */

const NOT_READY = "Maple is almost ready. Please try again later.";
const FAIL = "Maple couldn’t answer just now. Please try again in a moment.";

export type MapleReply = { msg?: MapleMsg; left?: MapleLeft; error?: string };

/** The member's chat and questions left (loaded when Maple first opens on a page). */
export async function mapleChat(): Promise<{ msgs: MapleMsg[]; left: MapleLeft; ready: boolean } | { error: string }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { error: "Join free to ask Maple." };
  const [h, left] = await Promise.all([mapleHistory(supabase, userId), mapleLeft(supabase)]);
  return { ...h, left };
}

export async function askMaple(question: string): Promise<MapleReply> {
  const { supabase, userId, profile } = await getViewer();
  if (!userId || !profile) return { error: "Join free to ask Maple." };
  if (profile.status !== "active") return { error: "Your account can’t use Maple right now." };
  const q = String(question ?? "").replace(/\s+/g, " ").trim();
  if (q.length < 3) return { error: "Type a question first" };
  if (q.length > 600) return { error: "Please keep your question under 600 characters." };
  const settings = await mapleSettings(supabase, userId);
  if (settings && !settings.on) return { error: "Maple is turned off in your settings." };

  // what members have already shared about it (only what the member is allowed to see)
  const found = await findSources(q, userId);
  const counts = { posts: found.posts.length, members: found.members.filter((m) => m.id !== userId).length };

  const edge = await mapleEdge<{ id?: number | null; route?: string; a?: MapleAnswer; ai?: boolean; error?: string }>(supabase, "maple-ask", { question: q, found: counts });
  if (edge) {
    if (edge.status !== 200 || !edge.data.a) return { error: edge.data.error || FAIL };
    const a = await mapleEnrich(supabase, userId, q, edge.data.a, found);
    const id = edge.data.id ?? null;
    // keep the people and replies with the answer, so the history shows them again
    if (id) await serviceClient()?.from("maple_messages").update({ meta: { a, ai: !!edge.data.ai } }).eq("id", id).eq("user_id", userId);
    const left = await mapleLeft(supabase);
    return { msg: { id: id ? String(id) : `x${Date.now()}`, by: "maple", t: a.t.join(" "), a, q: edge.data.route === "limit" ? undefined : q, ai: !!edge.data.ai, at: new Date().toISOString() }, left };
  }
  return fallback(q, found, settings, userId, profile);
}

/** Maple's Edge Function isn't there yet (or can't be reached): the Hub's own rules, then the earlier engine. */
async function fallback(q: string, found: Awaited<ReturnType<typeof findSources>>, settings: MapleSettings | null, userId: string, profile: { full_name: string | null; location: string | null; created_at: string }): Promise<MapleReply> {
  const { supabase } = await getViewer();
  const db = settings ? serviceClient() : null; // the Maple tables, written only with the server key
  const first = String(profile.full_name ?? "").trim().split(/\s+/)[0] ?? "";
  const location = String(profile.location ?? "");
  const personal = settings?.personal !== false;
  let helps: string[] = [];
  if (personal) {
    const { data: d } = await supabase.rpc("get_profile_details", { p_ids: [userId] });
    helps = ((d ?? []) as { helps_with: string[] }[])[0]?.helps_with ?? [];
  }
  const ctx: MapleCtx = {
    first,
    city: personal ? location : "",
    industry: personal ? helps[0] ?? "" : "",
    ontario: personal && /,\s*ON\b/.test(location),
    isNew: Date.now() - new Date(profile.created_at).getTime() < 7 * 86400000,
  };

  // one question from this month's allowance
  let ok = false;
  let limit: number | null = 10;
  if (db) {
    const { data: lim, error } = await db.rpc("maple_monthly_limit", { p_user: userId });
    if (error) return { error: mapleMissing(error.message) ? NOT_READY : FAIL };
    limit = typeof lim === "number" ? lim : null;
    const { data: took } = await db.rpc("maple_take_question", { p_user: userId, p_monthly_limit: limit, p_daily_cap: 20 });
    ok = took === true;
  } else {
    const { data: took } = await supabase.rpc("hub_ai_take");
    ok = took === true;
    limit = (await mapleLeft(supabase)).limit;
  }
  const { data: asked } = db ? await db.from("maple_messages").insert({ user_id: userId, role: "member", body: q, route: ok ? null : "limit" }).select("id").single() : { data: null };
  if (!ok) {
    const left = await mapleLeft(supabase);
    const a = mapleLimit(q, limit, limit === null || left.used < (limit ?? 0));
    return { msg: { id: `x${Date.now()}`, by: "maple", t: a.t.join(" "), a, at: new Date().toISOString() }, left };
  }

  let route: "hub" | "small" | "refused" = "hub";
  let ai = false;
  const rule = mapleHubAnswer(q, ctx, { posts: found.posts.length, members: found.members.filter((m) => m.id !== userId).length });
  let a: MapleAnswer;
  if (rule) a = await mapleEnrich(supabase, userId, q, rule, found);
  else {
    const text = await writeAnswer(q, found);
    ai = !!text;
    route = text ? "small" : "refused";
    a = text || found.posts.length || found.members.length ? legacyAnswer(q, text, found) : mapleUnknown(q);
  }

  let id = `x${Date.now()}`;
  if (db) {
    await db.rpc("maple_record_usage", { p_user: userId, p_route: route, p_in: 0, p_out: 0, p_cached: 0 });
    if (asked?.id) await db.from("maple_messages").update({ route }).eq("id", asked.id);
    const { data: saved } = await db.from("maple_messages").insert({ user_id: userId, role: "maple", body: a.t.join("\n\n").replace(/\*\*/g, "").slice(0, 4000) || "…", route, meta: { a, ai } }).select("id").single();
    if (saved?.id) id = String(saved.id);
  } else {
    const { data: sid } = await supabase.rpc("hub_ai_save", { p_question: q, p_answer: a.t.join("\n\n").replace(/\*\*/g, ""), p_sources: found });
    if (sid) id = `old-${sid}`;
  }
  return { msg: { id, by: "maple", t: a.t.join(" "), a, q, ai, at: new Date().toISOString() }, left: await mapleLeft(supabase) };
}

/** Thumbs up or down on one of Maple's answers (the member can change only the rating). */
export async function rateMaple(id: string, v: -1 | 0 | 1): Promise<{ ok?: true; error?: string }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { error: "Please sign in." };
  if (!/^\d+$/.test(id) || ![-1, 0, 1].includes(v)) return { ok: true }; // earlier answers can't be rated
  const { error } = await supabase.from("maple_messages").update({ feedback: v === 0 ? null : v }).eq("id", Number(id)).eq("user_id", userId).eq("role", "maple");
  return error ? { error: "Could not save that." } : { ok: true };
}

/** Settings > Maple (AI assistant). */
export async function setMapleSetting(key: keyof MapleSettings, value: boolean): Promise<{ ok?: true; error?: string }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { error: "Please sign in." };
  const col = { on: "enabled", personal: "use_profile", tips: "show_tips" }[key];
  if (!col || typeof value !== "boolean") return { error: "That choice isn’t available." };
  const { error } = await supabase.from("maple_settings").upsert({ user_id: userId, [col]: value }, { onConflict: "user_id" });
  if (error) return { error: mapleMissing(error.message) ? NOT_READY : "Could not save that." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Deletes every message between the member and Maple. Questions used this month stay the same. */
export async function deleteMapleHistory(): Promise<{ ok?: true; error?: string }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { error: "Please sign in." };
  const [m, o] = await Promise.all([
    supabase.from("maple_messages").delete().eq("user_id", userId),
    supabase.from("ai_asks").delete().eq("user_id", userId),
  ]);
  if (m.error && !mapleMissing(m.error.message)) return { error: "Could not delete it. Please try again." };
  if (o.error && m.error) return { error: "Could not delete it. Please try again." };
  return { ok: true };
}

/** The Hub team's answer library and token report (Update 47), through the maple-admin Edge Function. */
export async function mapleAdmin<T = Record<string, unknown>>(action: "list" | "save" | "approve" | "retire" | "repeated" | "draft" | "report", payload: Record<string, unknown> = {}): Promise<T & { error?: string }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { error: "Please sign in." } as T & { error?: string };
  const { data: staff } = await supabase.rpc("is_staff");
  if (staff !== true) return { error: "Hub team only." } as T & { error?: string };
  const r = await mapleEdge<T & { error?: string }>(supabase, "maple-admin", { ...payload, action }, 30_000);
  if (!r) return { error: "The Maple service isn’t set up yet." } as T & { error?: string };
  if (r.status !== 200) return { ...r.data, error: r.data.error || "That didn’t work. Please try again." };
  return r.data;
}
