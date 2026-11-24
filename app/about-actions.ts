"use server";

import { createClient } from "@/lib/supabase/server";

/** About page (Update 15): the weekly Hub briefing sign-up. Saved in the database; only the team can read the list. */
export async function subscribeBriefing(email: string): Promise<{ ok?: boolean; error?: string }> {
  const e = String(email ?? "").trim().slice(0, 254);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Enter your email address, like you@business.ca" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("briefing_subscribe", { p_email: e });
  return error || !data ? { error: "Could not sign you up. Try again." } : { ok: true };
}
