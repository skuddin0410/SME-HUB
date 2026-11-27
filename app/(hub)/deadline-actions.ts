"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/hub";
import { cleanSetup, DEFAULT_REM, torontoToday, type DlRem, type DlSetup } from "@/lib/deadlines";

type R = { error?: string; ok?: boolean; id?: string };
const done = (): R => { revalidatePath("/deadlines"); revalidatePath("/feed"); return { ok: true }; };

/** Saves the member's answers (Update 13). Only they can read them; the database checks that. */
export async function saveDeadlineSetup(setup: Partial<DlSetup>): Promise<R> {
  const { supabase, userId } = await requireUser();
  // Update 38: the day the member first created their deadlines (kept when they change their answers), so dates
  // from before that never show as overdue. Members who set up before Update 38 have none: the page looks back 60 days.
  const { data: had } = await supabase.from("deadline_settings").select("setup").eq("user_id", userId).maybeSingle();
  const prev = (had as { setup?: DlSetup } | null)?.setup;
  const at = prev ? prev.at : torontoToday();
  const { error } = await supabase.from("deadline_settings").upsert({ user_id: userId, setup: cleanSetup({ ...setup, at }), updated_at: new Date().toISOString() });
  return error ? { error: "Could not save. Try again." } : done();
}

export async function setDeadlineDone(key: string, on: boolean): Promise<R> {
  const { supabase, userId } = await requireUser();
  if (!/^[a-z]{3}\|[\w-]+\|.{1,200}$/.test(key)) return { error: "That deadline was not found." };
  const { data } = await supabase.from("deadline_settings").select("done").eq("user_id", userId).maybeSingle();
  if (!data) return { error: "Set up your deadlines first." };
  const d = { ...((data as { done: Record<string, boolean> }).done ?? {}) };
  if (on) d[key] = true; else delete d[key];
  // keep the list small: only keys from the last year are worth keeping
  const keys = Object.keys(d);
  if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete d[k]);
  const { error } = await supabase.from("deadline_settings").update({ done: d }).eq("user_id", userId);
  return error ? { error: "Could not save. Try again." } : done();
}

export async function saveReminders(rem: Partial<DlRem>): Promise<R> {
  const { supabase, userId } = await requireUser();
  const clean = Object.fromEntries(Object.keys(DEFAULT_REM).map((k) => [k, !!(rem as Record<string, unknown>)[k]]));
  const { error } = await supabase.from("deadline_settings").update({ rem: clean }).eq("user_id", userId);
  return error ? { error: "Could not save. Try again." } : done();
}

export async function addOwnDeadline(input: { title: string; due: string; rep: string; note: string }): Promise<R> {
  const { supabase, userId } = await requireUser();
  const title = String(input.title ?? "").trim().slice(0, 120);
  if (!title) return { error: "Give the deadline a name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.due))) return { error: "Choose a date." };
  const rep = ["none", "month", "quarter", "year"].includes(input.rep) ? input.rep : "none";
  const { data, error } = await supabase.from("deadline_custom").insert({ user_id: userId, title, due: input.due, rep, note: String(input.note ?? "").trim().slice(0, 300) }).select("id").single();
  if (error) return { error: error.message.includes("100") ? "You can keep up to 100 of your own deadlines." : "Could not add it. Try again." };
  done();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteOwnDeadline(id: string): Promise<R> {
  const { supabase, userId } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: "That deadline was not found." };
  const { error } = await supabase.from("deadline_custom").delete().eq("id", id).eq("user_id", userId);
  return error ? { error: "Could not delete. Try again." } : done();
}

/** Update 38: the member's own calendar link that updates itself. `reset` makes a new one (the old one stops working). */
export async function deadlineFeed(reset = false): Promise<R & { url?: string }> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("deadline_settings").select("feed_token").eq("user_id", userId).maybeSingle();
  if (!data) return { error: "Set up your deadlines first." };
  let token = (data as { feed_token?: string | null }).feed_token ?? null;
  if (!token || reset) {
    token = randomBytes(30).toString("base64url");
    const { error } = await supabase.from("deadline_settings").update({ feed_token: token }).eq("user_id", userId);
    if (error) return { error: "The calendar link isn’t ready yet. Please try again later." };
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://smehub.ca").replace(/\/$/, "");
  return { ok: true, url: `${site.replace(/^https?:\/\//, "webcal://")}/deadlines/${token}.ics` };
}
