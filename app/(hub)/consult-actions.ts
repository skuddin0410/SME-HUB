"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { serviceClient } from "@/lib/supabase/service";
import { consultTimes, timeIsOpen, afterBooked, afterMoved, afterCancelled, getBooking, zoomGoneEmail, type Booking } from "@/lib/apps/consult-server";
import { zoomDisconnect } from "@/lib/apps/zoom";
import { gcalDisconnect } from "@/lib/apps/gcal";
import type { Slot } from "@/lib/consult";

/** Update 36: free consultations (member side and Advisor side) and Connected apps. */
type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$/;
const why = (m: string) => /consult: (.*)$/.exec(m)?.[1]?.replace(/^./, (c) => c.toUpperCase()) ?? "That didn’t work. Try again.";
const NOT_READY = "Free consultations are almost ready. Please try again later.";

/** Fresh open times (after a month change, a failed booking, or "Reschedule"). */
export async function consultDays(advisorId: string, moving?: string): Promise<R<{ days: [string, Slot[]][] }>> {
  if (!UUID.test(advisorId)) return { ok: false, error: "Unknown Advisor." };
  const { supabase } = await requireUser();
  let ignore: string | undefined;
  if (moving && UUID.test(moving)) ignore = (await supabase.from("consult_bookings").select("starts_at").eq("id", moving).maybeSingle()).data?.starts_at as string | undefined;
  const { pub, days } = await consultTimes(supabase, advisorId, ignore);
  if (!pub.open) return { ok: false, error: "This Advisor isn’t taking bookings right now." };
  return { ok: true, days };
}

/** "Next": hold the time for 5 minutes while the member fills in the form. */
export async function holdTime(advisorId: string, at: string, moving?: string): Promise<R> {
  if (!UUID.test(advisorId) || !ISO.test(at)) return { ok: false, error: "Pick a time." };
  const { supabase, userId } = await requireUser();
  const db = serviceClient();
  if (!db) return { ok: false, error: NOT_READY };
  let ignore: string | undefined;
  if (moving && UUID.test(moving)) ignore = (await supabase.from("consult_bookings").select("starts_at").eq("id", moving).maybeSingle()).data?.starts_at as string | undefined;
  if (!(await timeIsOpen(supabase, advisorId, at, ignore))) return { ok: false, error: "That time was just taken. Pick another." };
  const { error } = await db.rpc("consult_hold", { p_member: userId, p_advisor: advisorId, p_start: at });
  if (error && !/no longer available|already|booked/.test(error.message)) return { ok: false, error: why(error.message) };
  return { ok: true };
}

export type BookedView = { id: string; at: string; minutes: number; topic: string; biz: string; joinUrl: string | null };

/** "Book my free call". With `moving`, the existing booking gets the new time instead. */
export async function bookConsult(advisorId: string, at: string, f: { biz: string; topic: string; web: string }, moving?: string): Promise<R<{ booked: BookedView }>> {
  if (!UUID.test(advisorId) || !ISO.test(at)) return { ok: false, error: "Pick a time." };
  const { supabase, userId } = await requireUser();
  const db = serviceClient();
  if (!db) return { ok: false, error: NOT_READY };
  const { data: rl } = await supabase.rpc("rate_hit", { p_key: "consult-book", p_max: 10, p_window: 3600 });
  if (rl === false) return { ok: false, error: "Too many tries. Please wait a little and try again." };
  const web = String(f.web ?? "").trim();
  const webOk = !web || /^https?:\/\/[^\s<>"]{3,190}$/.test(web) ? web : `https://${web.replace(/^\/+/, "")}`;
  if (webOk && !/^https?:\/\/[^\s<>"]{3,190}\.[^\s<>"]+$/.test(webOk)) return { ok: false, error: "Check the website address." };
  let ignore: string | undefined;
  if (moving) {
    if (!UUID.test(moving)) return { ok: false, error: "No booking to move." };
    ignore = (await supabase.from("consult_bookings").select("starts_at").eq("id", moving).maybeSingle()).data?.starts_at as string | undefined;
    if (!ignore) return { ok: false, error: "No booking to move." };
  }
  if (!(await timeIsOpen(supabase, advisorId, at, ignore))) return { ok: false, error: "That time was just taken. Pick another." };
  const { data, error } = await db.rpc("consult_book", {
    p_member: userId, p_advisor: advisorId, p_start: at,
    p_biz: String(f.biz ?? "").slice(0, 160), p_topic: String(f.topic ?? "").slice(0, 600), p_web: webOk.slice(0, 200), p_move: moving ?? null,
  });
  if (error) return { ok: false, error: /consult_|function/.test(error.message) && !/consult: /.test(error.message) ? NOT_READY : why(error.message) };
  const id = data as string;
  if (moving) await afterMoved(id, userId);
  else await afterBooked(id);
  const b = await getBooking(id);
  revalidatePath(`/members/${advisorId}`);
  return { ok: true, booked: { id, at: b?.starts_at ?? at, minutes: b?.minutes ?? 30, topic: b?.topic ?? "", biz: b?.biz ?? "", joinUrl: b?.join_url ?? null } };
}

/** Either person cancels, up to the start. */
export async function cancelConsult(id: string): Promise<R> {
  if (!UUID.test(id)) return { ok: false, error: "Unknown call." };
  const { userId } = await requireUser();
  const db = serviceClient();
  if (!db) return { ok: false, error: NOT_READY };
  const { data, error } = await db.rpc("consult_cancel", { p_by: userId, p_id: id });
  if (error) return { ok: false, error: why(error.message) };
  const b = data as Booking;
  await afterCancelled(b);
  revalidatePath(`/members/${b.advisor_id}`);
  revalidatePath("/settings/consultations");
  return { ok: true };
}

// ---------- the Advisor's settings ----------
export type ConsultPatch = Partial<{
  len: number; gap: number; max_day: number; ahead: number; notice: number; hours: Record<string, { am: boolean; pm: boolean }>;
  q_biz: boolean; q_topic: boolean; q_web: boolean; reg_mail: "each" | "daily"; gcal: boolean;
}>;
const ALLOWED: Record<string, (v: unknown) => boolean> = {
  len: (v) => [15, 30, 45].includes(v as number),
  gap: (v) => [0, 15, 30].includes(v as number),
  max_day: (v) => [0, 2, 3, 5].includes(v as number),
  ahead: (v) => [14, 30, 60].includes(v as number),
  notice: (v) => [4, 12, 24].includes(v as number),
  hours: (v) => !!v && typeof v === "object" && ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].every((k) => {
    const d = (v as Record<string, { am: unknown; pm: unknown }>)[k];
    return d && typeof d.am === "boolean" && typeof d.pm === "boolean";
  }) && Object.keys(v as object).length === 7,
  q_biz: (v) => typeof v === "boolean",
  q_topic: (v) => typeof v === "boolean",
  q_web: (v) => typeof v === "boolean",
  reg_mail: (v) => v === "each" || v === "daily",
  gcal: (v) => typeof v === "boolean",
};

export async function saveConsultSettings(patch: ConsultPatch): Promise<R> {
  const { supabase, userId } = await requireUser();
  const row: Record<string, unknown> = { advisor_id: userId, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (!ALLOWED[k]?.(v)) return { ok: false, error: "That setting can’t be saved." };
    row[k] = v;
  }
  if (patch.gcal === true) {
    const db = serviceClient();
    const { data } = db ? await db.from("advisor_gcal").select("user_id").eq("user_id", userId).maybeSingle() : { data: null };
    if (!data) return { ok: false, error: "Connect Google Calendar first." };
  }
  const { error } = await supabase.from("consult_settings").upsert(row, { onConflict: "advisor_id" });
  if (error) return { ok: false, error: /row-level|policy/.test(error.message) ? "Free consultations are for SME Advisors." : /consult_settings/.test(error.message) ? NOT_READY : "Could not save that. Try again." };
  revalidatePath("/settings/consultations");
  revalidatePath(`/members/${userId}`);
  return { ok: true };
}

/** Disconnect Zoom: upcoming meetings stay in the Advisor's Zoom; we email a list of what needs a new link. */
export async function disconnectZoom(): Promise<R> {
  const { userId } = await requireUser();
  await zoomDisconnect(userId);
  await zoomGoneEmail(userId);
  revalidatePath("/settings/apps");
  revalidatePath("/settings/consultations");
  return { ok: true };
}

export async function disconnectGcal(): Promise<R> {
  const { userId } = await requireUser();
  await gcalDisconnect(userId);
  revalidatePath("/settings/apps");
  return { ok: true };
}
