"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUser } from "@/lib/hub";
import { getHubSettings } from "@/lib/zip/settings-load";
import { mayCloseAccount } from "@/lib/zip/profile-rules";
import { VISIBILITY_FIELDS, VISIBILITY_LEVELS } from "@/lib/profile-extra";
import { PRESETS, type PresetKey } from "@/lib/settings";

/** Update 33: Settings and privacy. Every choice saves the moment it is made (the new sign-in email is the only Save). */
type Result = { ok: true } | { ok: false; error: string };
const FAIL = "Could not save that. Check your connection and try again.";
const NOT_READY = "This setting is almost ready. Please try again later.";

type Field = { k: string; vis: string; lock: boolean };

async function teamFields(): Promise<Field[]> {
  return ((await getHubSettings("profiles")).fields ?? []) as Field[];
}

/** Saves the member's visibility for some parts of the profile, keeping only choices that differ from the default. */
async function writeVisibility(next: Record<string, string>): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const fields = await teamFields();
  const cur = ((await supabase.from("profile_details").select("visibility").eq("user_id", userId).maybeSingle()).data as { visibility?: Record<string, string> } | null)?.visibility ?? {};
  const vis = { ...cur };
  for (const [k, v] of Object.entries(next)) {
    if (!(v in VISIBILITY_LEVELS)) return { ok: false, error: "Choose who can see it." };
    const f = fields.find((x) => x.k === k);
    if (f) {
      if (f.lock) continue; // the Hub team set this one
      if (v === f.vis) delete vis[k];
      else vis[k] = v;
    } else if (VISIBILITY_FIELDS.some(([x]) => x === k)) {
      if (v === "public") delete vis[k];
      else vis[k] = v;
    }
  }
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, visibility: vis });
  if (error) return { ok: false, error: FAIL };
  revalidatePath("/settings");
  revalidatePath(`/members/${userId}`);
  return { ok: true };
}

export async function setVisibility(key: string, level: string): Promise<Result> {
  return writeVisibility({ [key]: level });
}

/** Open, Balanced or Private: sets every part the preset covers at once. */
export async function applyPreset(p: PresetKey): Promise<Result> {
  if (!(p in PRESETS)) return { ok: false, error: "Choose a quick setting." };
  return writeVisibility(PRESETS[p]);
}

export async function setRecordViews(on: boolean): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, private_browsing: !on });
  if (error) return { ok: false, error: FAIL };
  revalidatePath("/settings");
  return { ok: true };
}

const BOOLS = ["show_online", "in_directory", "indexable", "allow_tags", "alert_messages", "alert_requests", "alert_leads", "alert_deadlines", "alert_news", "alert_events"] as const;
const CHOICES: Record<string, readonly string[]> = {
  language: ["en", "fr"],
  who_message: ["anyone", "conn"],
  who_request: ["everyone", "shared"],
  digest: ["daily", "weekly", "off"],
};
export type SettingKey = (typeof BOOLS)[number] | "language" | "who_message" | "who_request" | "digest" | "paused";

export async function setSetting(key: SettingKey, value: boolean | string): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const row: Record<string, unknown> = { member_id: userId };
  if ((BOOLS as readonly string[]).includes(key)) row[key] = value === true;
  else if (key === "paused") row.paused_at = value === true ? new Date().toISOString() : null;
  else if (CHOICES[key]?.includes(String(value))) row[key] = String(value);
  else return { ok: false, error: "That choice isn’t available." };
  const { error } = await supabase.from("member_settings").upsert(row, { onConflict: "member_id" });
  if (error) return { ok: false, error: /member_settings/.test(error.message) ? NOT_READY : FAIL };
  revalidatePath("/settings");
  if (key === "paused" || key === "in_directory" || key === "indexable") revalidatePath(`/members/${userId}`);
  return { ok: true };
}

/** A new sign-in email: Supabase emails a confirmation link, and the old address stays until it's confirmed. */
export async function changeSignInEmail(next: string): Promise<Result> {
  const email = String(next ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return { ok: false, error: "Please enter a full email address." };
  const { supabase } = await requireUser();
  const h = await headers();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`).replace(/\/$/, "");
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${site}/auth/confirm?next=/settings` });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { ok: false, error: "That email is already used by another account." };
    if (/rate|seconds/i.test(error.message)) return { ok: false, error: "Please wait a minute before trying again." };
    return { ok: false, error: "Could not send the confirmation. Try again." };
  }
  return { ok: true };
}

/** Close my account: a 30-day wait, then it's deleted. Paid members ask the Hub team (so billing stops properly). */
export async function closeAccount(): Promise<{ ok: true; on: string } | { ok: false; error: string }> {
  const { supabase, userId } = await requireUser();
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (!mayCloseAccount(await getHubSettings("profiles"), (me as { plan?: string } | null)?.plan)) return { ok: false, error: "Please ask the Hub team to close your account." };
  const { data, error } = await supabase.rpc("close_my_account");
  if (error) return { ok: false, error: /last admin/.test(error.message) ? "The last admin can’t close their account." : /close_my_account/.test(error.message) ? NOT_READY : FAIL };
  revalidatePath("/settings");
  return { ok: true, on: String(data) };
}

export async function keepAccount(): Promise<Result> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("keep_my_account");
  if (error) return { ok: false, error: FAIL };
  revalidatePath("/settings");
  return { ok: true };
}
