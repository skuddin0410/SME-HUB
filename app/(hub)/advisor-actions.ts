"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { torontoIso } from "@/lib/advisors";

export type AdvResult = { ok?: boolean; error?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const err = (m: string) => (/advisors: (.*)$/.exec(m)?.[1] ?? "That didn’t work. Try again.");

export async function bookAdvisor(slotId: string, question: string): Promise<AdvResult> {
  if (!isId(slotId)) return { error: "Pick a time." };
  const v = await getViewer();
  if (!v.userId) return { error: "Join free to book a call." };
  const { error } = await v.supabase.rpc("advisor_book", { p_slot: slotId, p_question: String(question ?? "").slice(0, 500) });
  if (error) return { error: err(error.message) };
  revalidatePath("/members/[id]", "page");
  return { ok: true };
}

export async function cancelAdvisorCall(slotId: string): Promise<AdvResult> {
  if (!isId(slotId)) return { error: "Unknown call." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("advisor_cancel", { p_slot: slotId });
  if (error) return { error: err(error.message) };
  revalidatePath("/members/[id]", "page");
  revalidatePath("/team/advisors");
  return { ok: true };
}

export async function toggleSeat(advisorId: string, on: boolean): Promise<AdvResult> {
  if (!isId(advisorId)) return { error: "Unknown advisor." };
  const v = await getViewer();
  if (!v.userId) return { error: "Join free to save a seat." };
  const q = on ? v.supabase.from("advisor_seats").insert({ advisor_id: advisorId, member_id: v.userId })
    : v.supabase.from("advisor_seats").delete().eq("advisor_id", advisorId).eq("member_id", v.userId);
  const { error } = await q;
  if (error && !/duplicate/.test(error.message)) return { error: "That didn’t save. Try again." };
  return { ok: true };
}

export async function reviewAdvisor(advisorId: string, rating: number, body: string): Promise<AdvResult> {
  if (!isId(advisorId)) return { error: "Unknown advisor." };
  const r = Math.round(Number(rating));
  const b = String(body ?? "").trim();
  if (!(r >= 1 && r <= 5)) return { error: "Choose a star rating." };
  if (b.length < 10) return { error: "Write a sentence or two about the call." };
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in first." };
  const { error } = await v.supabase.from("advisor_reviews").insert({ advisor_id: advisorId, member_id: v.userId, rating: r, body: b.slice(0, 600) });
  if (error) return { error: /duplicate/.test(error.message) ? "You have already reviewed this advisor." : "Only members who had a call can leave a review." };
  revalidatePath("/members/[id]", "page");
  return { ok: true };
}

/** The advisor's own open times (the Hub team can manage anyone's on the team page). */
export async function addAdvisorTime(advisorId: string, localToronto: string, minutes: number): Promise<AdvResult> {
  if (!isId(advisorId)) return { error: "Unknown advisor." };
  const iso = torontoIso(String(localToronto ?? ""));
  if (!iso) return { error: "Pick a date and time." };
  const t = new Date(iso);
  const v = await getViewer();
  const { error } = await v.supabase.from("advisor_slots").insert({ advisor_id: advisorId, starts_at: t.toISOString(), minutes: [15, 20, 30].includes(minutes) ? minutes : 15 });
  if (error) return { error: /duplicate/.test(error.message) ? "That time is already open." : err(error.message) };
  revalidatePath("/members/[id]", "page");
  revalidatePath("/team/advisors");
  return { ok: true };
}

export async function removeAdvisorTime(slotId: string): Promise<AdvResult> {
  if (!isId(slotId)) return { error: "Unknown time." };
  const v = await getViewer();
  const { error } = await v.supabase.from("advisor_slots").delete().eq("id", slotId).is("booked_by", null);
  if (error) return { error: "That time could not be removed." };
  revalidatePath("/members/[id]", "page");
  revalidatePath("/team/advisors");
  return { ok: true };
}
