"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";

/** Update 30: what a member can change on their own leads. The database checks they may see the lead. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Result = { error?: string };

async function update(id: string, values: Record<string, unknown>): Promise<Result> {
  if (!UUID.test(id)) return { error: "That lead could not be found." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("leads").update(values).eq("id", id).select("id");
  if (error) return { error: "Could not save that. Try again." };
  if (!data?.length) return { error: "That lead could not be found." };
  revalidatePath("/leads");
  return {};
}

export async function setLeadStatus(id: string, status: string, reason?: string): Promise<Result> {
  if (!["new", "quoted", "won", "lost"].includes(status)) return { error: "Choose a status." };
  const lost = status === "lost" ? String(reason ?? "").trim().slice(0, 160) || null : null;
  return update(id, { status, lost_reason: lost });
}

export async function saveLeadNote(id: string, note: string): Promise<Result> {
  return update(id, { note: String(note ?? "").trim().slice(0, 2000) || null });
}

export async function saveLeadContact(id: string, email: string, phone: string): Promise<Result> {
  const e = String(email ?? "").trim().slice(0, 254);
  const p = String(phone ?? "").trim().slice(0, 20);
  if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return { error: "Check the email address." };
  if (p && !/^\+?[0-9 ()-]{7,20}$/.test(p)) return { error: "Check the phone number." };
  return update(id, { contact_email: e || null, contact_phone: p || null });
}

/** "Remind me tomorrow": the reminder moves to 9 am Eastern tomorrow. */
export async function remindLeadTomorrow(id: string): Promise<Result> {
  const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const ymd = t.toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const offset = /EDT|GMT-4/.test(t.toLocaleString("en-US", { timeZone: "America/Toronto", timeZoneName: "short" })) ? "-04:00" : "-05:00";
  return update(id, { follow_up_at: new Date(`${ymd}T09:00:00${offset}`).toISOString() });
}
