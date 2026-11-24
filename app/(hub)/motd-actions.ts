"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Update 11: the Hub team picks the Member of the Day for a date (today or later). The database checks it is the team. */
export async function pickMemberOfDay(day: string, memberId: string): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, userId, isStaff } = await getViewer();
  if (!userId || !isStaff) return { error: "Only the Hub team can do this." };
  if (!DAY.test(day) || !UUID.test(memberId)) return { error: "Choose a date and a member." };
  const { data: today } = await supabase.rpc("motd_today");
  if (typeof today === "string" && day < today) return { error: "Choose today or a later date." };
  const { error } = await supabase.from("member_of_day").upsert({ day, member_id: memberId, picked_by: userId }, { onConflict: "day" });
  if (error) return { error: "Could not save. Try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Takes the team's pick off a date; the day then gets an automatic member. */
export async function removeMemberOfDay(day: string): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, userId, isStaff } = await getViewer();
  if (!userId || !isStaff) return { error: "Only the Hub team can do this." };
  if (!DAY.test(day)) return { error: "That date does not look right." };
  const { data: today } = await supabase.rpc("motd_today");
  if (typeof today === "string" && day < today) return { error: "Past days stay as they were." };
  const { error } = await supabase.from("member_of_day").delete().eq("day", day);
  if (error) return { error: "Could not remove. Try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}
