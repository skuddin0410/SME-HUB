"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { torontoIso } from "@/lib/advisors";

export type TeamResult = { ok?: boolean; error?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const s = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);
const n = (f: FormData, k: string, max: number) => Math.min(max, Math.max(0, parseInt(String(f.get(k) ?? "0"), 10) || 0));

/** Saves an advisor profile: the Hub team for anyone, an advisor for themself (the database checks both). */
export async function saveAdvisorProfile(memberId: string, f: FormData): Promise<TeamResult> {
  if (!isId(memberId)) return { error: "Unknown advisor." };
  const v = await getViewer();
  if (!v.userId || (!v.isStaff && v.userId !== memberId)) return { error: "Not allowed." };
  const rating = String(f.get("rating") ?? "").trim();
  const services = s(f, "services", 3000).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => {
    const [name, ...rest] = l.split(":");
    return { name: name.trim().slice(0, 80), text: rest.join(":").trim().slice(0, 200) };
  }).filter((x) => x.name);
  const at = s(f, "session_at", 30);
  const row: Record<string, unknown> = {
    field: s(f, "field", 60), years: n(f, "years", 80), helped: n(f, "helped", 100000), reply: s(f, "reply", 40), langs: s(f, "langs", 120),
    creds: s(f, "creds", 1500).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => l.slice(0, 120)),
    services, session_title: s(f, "session_title", 120), session_at: at ? torontoIso(at) : null, updated_at: new Date().toISOString(),
  };
  if (v.isStaff) {
    row.rating = rating && Number(rating) >= 0 && Number(rating) <= 5 ? Number(rating) : null;
    row.active = f.get("active") === "on";
  }
  const { error } = v.isStaff
    ? await v.supabase.from("advisor_profiles").upsert({ user_id: memberId, ...row })
    : await v.supabase.from("advisor_profiles").update(row).eq("user_id", memberId);
  if (error) return { error: "The advisor profile could not be saved." };
  revalidatePath("/team/advisors");
  revalidatePath("/smb-advisor");
  revalidatePath("/members/[id]", "page");
  return { ok: true };
}

/** The Hub team makes a member an SMB Advisor (their advisor profile starts empty). */
export async function addAdvisor(memberId: string): Promise<TeamResult> {
  if (!isId(memberId)) return { error: "Choose a member." };
  const v = await getViewer();
  if (!v.isStaff) return { error: "For the Hub team." };
  const { error } = await v.supabase.from("advisor_profiles").insert({ user_id: memberId });
  if (error) return { error: /duplicate/.test(error.message) ? "That member is already an advisor." : "Could not add the advisor." };
  revalidatePath("/team/advisors");
  return { ok: true };
}

/** Contact messages: mark handled or open again, and keep a short team note. */
export async function setContactHandled(id: string, handled: boolean): Promise<TeamResult> {
  if (!isId(id)) return { error: "Unknown message." };
  const v = await getViewer();
  if (!v.isStaff) return { error: "For the Hub team." };
  const { error } = await v.supabase.from("contact_messages").update({ handled_at: handled ? new Date().toISOString() : null }).eq("id", id);
  if (error) return { error: "That didn’t save." };
  revalidatePath("/team/contact");
  return { ok: true };
}

export async function saveContactNote(id: string, note: string): Promise<TeamResult> {
  if (!isId(id)) return { error: "Unknown message." };
  const v = await getViewer();
  if (!v.isStaff) return { error: "For the Hub team." };
  const { error } = await v.supabase.from("contact_messages").update({ team_note: String(note ?? "").slice(0, 1000) }).eq("id", id);
  if (error) return { error: "That didn’t save." };
  revalidatePath("/team/contact");
  return { ok: true };
}

/** Moderation log: undo one action. Business reports: remove or keep. */
export async function restoreFromLog(logId: string): Promise<TeamResult> {
  if (!isId(logId)) return { error: "Unknown entry." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("mod_restore", { p_log: logId });
  if (error) return { error: /already restored/.test(error.message) ? "Already restored." : "Could not restore." };
  revalidatePath("/moderation");
  return { ok: true };
}

export async function actOnBizReport(reportId: string, action: "remove" | "keep"): Promise<TeamResult> {
  if (!isId(reportId)) return { error: "Unknown report." };
  const v = await getViewer();
  const { error } = await v.supabase.rpc("biz_report_act", { p_report: reportId, p_action: action === "remove" ? "remove" : "keep" });
  if (error) return { error: "That didn’t save." };
  revalidatePath("/bizadmin");
  revalidatePath("/moderation");
  return { ok: true };
}

/** A member reports a business page or one of its reviews. */
export async function reportBusiness(companyId: string, reviewAuthorId: string | null, reason: string, note: string): Promise<TeamResult> {
  if (!isId(companyId) || (reviewAuthorId && !isId(reviewAuthorId))) return { error: "Unknown business." };
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to report." };
  const { error } = await v.supabase.from("business_reports").insert({ company_id: companyId, review_author_id: reviewAuthorId || null, reporter_id: v.userId, reason, note: String(note ?? "").slice(0, 500) });
  if (error) return { error: /duplicate|unique/.test(error.message) ? "You have already reported this." : /lot of reports/.test(error.message) ? "That is a lot of reports for one day." : "This can’t be reported." };
  return { ok: true };
}
