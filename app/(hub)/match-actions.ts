"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { AVAIL, GOALS, type Prefs } from "@/lib/matches";

export type MatchResult = { ok?: boolean; error?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const err = (m: string) => (/matches: (.*)$/.exec(m)?.[1] ?? "That didn’t save. Try again.");

/** Saves the five answers, then the page shows the matches. */
export async function saveMatchPrefs(p: Prefs): Promise<MatchResult> {
  const v = await getViewer();
  if (!v.userId) return { error: "Join free to get matched." };
  const needs = (p.needs ?? []).map((n) => String(n).trim().slice(0, 40)).filter(Boolean).slice(0, 12);
  const avail = (p.avail ?? []).filter((a) => AVAIL.some(([k]) => k === a));
  if (!needs.length) return { error: "Choose at least one thing you need help with" };
  if (!avail.length) return { error: "Choose when you are free" };
  const { error } = await v.supabase.from("match_prefs").upsert({
    user_id: v.userId, goal: GOALS.some(([k]) => k === p.goal) ? p.goal : "advice", needs, where_pref: p.where === "near" ? "near" : "any",
    avail, format: p.format === "group" ? "group" : "one", updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Your answers could not be saved. Try again." };
  revalidatePath("/matches");
  return { ok: true };
}

export async function bookMatch(other: string, slot: string): Promise<MatchResult> {
  if (!isId(other)) return { error: "Unknown member." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("match_book", { p_other: other, p_slot: String(slot ?? "").slice(0, 60) });
  if (error) return { error: err(error.message) };
  revalidatePath("/matches");
  return { ok: true };
}

export async function skipMatch(other: string): Promise<MatchResult> {
  if (!isId(other)) return { error: "Unknown member." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("match_skip", { p_other: other });
  if (error) return { error: err(error.message) };
  revalidatePath("/matches");
  return { ok: true };
}

export async function matchFeedback(other: string, vote: "up" | "down"): Promise<MatchResult> {
  if (!isId(other)) return { error: "Unknown member." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("match_feedback", { p_other: other, p_vote: vote === "up" ? "up" : "down" });
  if (error) return { error: err(error.message) };
  return { ok: true };
}
