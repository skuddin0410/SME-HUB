"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getViewer } from "@/lib/hub";
import { mail, people } from "@/lib/apps/mail";
import { siteUrl } from "@/lib/courses-mail";
import { CFG_DEFAULT, checkSite, domainOf, forgetSafetyCfg, type SafetyCfg } from "@/lib/safety/server";

/** Update 41: Safety and trust. Members' actions first, then the Hub team's (every one checked again by the database). */

export type WelcomeWeek = { left: number; days: number; fast: number; day: number; photo: boolean; conn: boolean; conn_day: number; msgs_day: number; limited: boolean } | null;
type Done = { ok?: boolean; error?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const DOMAIN = /^[a-z0-9.-]{3,253}$/;

/** The member's welcome week (null when it's over), for the Home card and the "This unlocks soon" window. */
export async function myWelcomeWeek(): Promise<WelcomeWeek> {
  const v = await getViewer();
  if (!v.userId) return null;
  const { data } = await v.supabase.rpc("my_welcome_week");
  return (data as WelcomeWeek) ?? null;
}

/** "Don't warn me again about this site". Blocked sites are never trusted, whatever this says. */
export async function trustSite(url: string): Promise<Done> {
  const v = await getViewer();
  const domain = domainOf(url);
  if (!v.userId || !DOMAIN.test(domain)) return { ok: false };
  const { error } = await v.supabase.from("link_trust").upsert({ user_id: v.userId, domain }, { ignoreDuplicates: true });
  return { ok: !error };
}

// ---------------------------------------------------------------- the Hub team

async function team() {
  const v = await getViewer();
  if (!v.userId || !v.isStaff) return null;
  return v;
}

const GUIDELINE: Record<string, string> = {
  "Link to a look-alike site": "No phishing: links that pretend to be SME Hub or CanadianSME",
  "Link to a blocked site": "No links to sites known for phishing, spam or scams",
  "Asks for a code": "Never ask members for passwords or sign-in codes",
};
function brokenRule(reasons: string[]) {
  for (const r of reasons) {
    if (GUIDELINE[r]) return GUIDELINE[r];
    if (r.startsWith("Same text")) return "No spam: the same text posted or sent again and again";
    if (r.startsWith("Scam words")) return "No scams: requests for money, gift cards, crypto, codes or passwords";
    if (r.startsWith("Look-alike name")) return "Be honest about who you are: don’t pretend to be the SME Hub team";
  }
  return "Community guidelines";
}

/** Approve, Remove, Remove and limit account, Remove and suspend. The member is emailed which guideline it broke. */
export async function decideHeld(id: string, decision: "approve" | "remove" | "limit" | "suspend", reason = ""): Promise<Done> {
  const v = await team();
  if (!v || !isId(id) || !["approve", "remove", "limit", "suspend"].includes(decision)) return { error: "Not allowed." };
  const { data, error } = await v.supabase.rpc("held_decide", { p_id: id, p_decision: decision, p_reason: reason.slice(0, 300) });
  if (error) return { error: error.message.includes("already decided") ? "Someone on the team already decided this one." : "That didn’t save. Try again." };
  const h = data as { author_id: string; kind: string; reasons: string[]; body: string } | null;
  if (h && decision !== "approve") {
    const p = (await people([h.author_id])).get(h.author_id);
    if (p) {
      const site = siteUrl();
      const what = h.kind === "message" ? "message" : h.kind === "comment" ? "comment" : "post";
      const quote = h.body.length > 140 ? `${h.body.slice(0, 140)}…` : h.body;
      const links = { guidelines_url: `${site}/policies/community-guidelines`, appeal_url: "mailto:support@smehub.ca?subject=Please%20review%20my%20account" };
      const rule = brokenRule(h.reasons ?? []);
      if (decision === "suspend") {
        await mail("account-suspended", p, { ...links, suspend_until: "our team finishes its review", suspend_reason: `Your ${what} “${quote}” broke this guideline: ${rule}.` }, { once: `safety-suspended-${id}` });
      } else {
        await mail("content-removed", p, {
          ...links,
          removed_item: `your ${what}: “${quote}”`,
          removed_reason: `It broke this guideline: ${rule}.${decision === "limit" ? " For the next 7 days you can’t share links, start groups or post offers, and your daily messages and connection requests are limited." : ""}`,
        }, { once: `safety-removed-${id}` });
      }
    }
  }
  revalidatePath("/moderation");
  return { ok: true };
}

/** "Looks fine", "Limit for 7 days" or "Suspend" for a new account worth watching. */
export async function watchDecide(memberId: string, action: "fine" | "limit" | "suspend"): Promise<Done> {
  const v = await team();
  if (!v || !isId(memberId) || !["fine", "limit", "suspend"].includes(action)) return { error: "Not allowed." };
  const { error } = await v.supabase.rpc("safety_member_action", { p_member: memberId, p_action: action, p_reason: null });
  if (error) return { error: "That didn’t save. Try again." };
  revalidatePath("/moderation");
  return { ok: true };
}

export async function blockSite(input: string, why: string): Promise<Done> {
  const v = await team();
  const domain = domainOf(input);
  if (!v) return { error: "Not allowed." };
  if (!domain.includes(".") || !DOMAIN.test(domain)) return { error: "Type a site, like example.com" };
  if (/(^|\.)(smehub|canadiansme)\.ca$/.test(domain)) return { error: "That’s our own site." };
  const reason = ["Phishing or look-alike", "Spam", "Scam"].includes(why) ? why : "Phishing or look-alike";
  const { error } = await v.supabase.from("blocked_sites").upsert({ domain, why: reason, added_by: v.userId }, { onConflict: "domain" });
  if (error) return { error: "That didn’t save. Try again." };
  await v.supabase.from("allowed_sites").delete().eq("domain", domain);
  await v.supabase.rpc("safety_log", { p_action: "block", p_kind: "site", p_target: domain, p_label: reason });
  revalidatePath("/moderation");
  return { ok: true };
}

export async function unblockSite(domain: string): Promise<Done> {
  const v = await team();
  if (!v || !DOMAIN.test(domain)) return { error: "Not allowed." };
  const { error } = await v.supabase.from("blocked_sites").delete().eq("domain", domain);
  if (error) return { error: "That didn’t save. Try again." };
  await v.supabase.rpc("safety_log", { p_action: "unblock", p_kind: "site", p_target: domain, p_label: domain });
  revalidatePath("/moderation");
  return { ok: true };
}

const NUMS: Record<string, number[]> = {
  perIp: [2, 3, 5], days: [3, 7, 14], fast: [2, 3, 5], conn: [5, 10, 20], msgs: [10, 20, 40], allConn: [25, 50, 100], allMsgs: [50, 100, 200], posts: [3, 5, 10], dupes: [2, 3, 5],
};
const SWITCHES = ["bot", "code", "throwaway", "links", "groups", "offers", "twostep", "webrisk", "leave", "paidLinks"];

/** One switch or number in Safety rules. Only the values the screen offers are accepted. */
export async function saveSafetyRule(key: string, value: boolean | number): Promise<Done> {
  const v = await team();
  if (!v) return { error: "Not allowed." };
  const ok = (SWITCHES.includes(key) && typeof value === "boolean") || (NUMS[key]?.includes(value as number) ?? false);
  if (!ok) return { error: "Not allowed." };
  const { data } = await v.supabase.from("safety_config").select("cfg").eq("id", 1).maybeSingle();
  const cfg = { ...CFG_DEFAULT, ...((data?.cfg as Partial<SafetyCfg>) ?? {}), [key]: value };
  const { error } = await v.supabase.from("safety_config").update({ cfg, updated_at: new Date().toISOString(), updated_by: v.userId }).eq("id", 1);
  if (error) return { error: "That didn’t save. Try again." };
  await v.supabase.rpc("safety_log", { p_action: "settings", p_kind: "safety", p_target: key, p_label: `${key}: ${String(value)}` });
  forgetSafetyCfg();
  revalidatePath("/moderation");
  return { ok: true };
}

/** The scam words or the protected names. */
export async function saveSafetyList(key: "words" | "names", list: string[]): Promise<Done> {
  const v = await team();
  if (!v || !["words", "names"].includes(key)) return { error: "Not allowed." };
  const clean = [...new Set(list.map((w) => String(w).trim().slice(0, 60)).filter((w) => w.length >= 2))].slice(0, 200);
  if (!clean.length) return { error: "Keep at least one." };
  const { error } = await v.supabase.from("safety_config").update({ [key]: clean, updated_at: new Date().toISOString(), updated_by: v.userId }).eq("id", 1);
  if (error) return { error: "That didn’t save. Try again." };
  await v.supabase.rpc("safety_log", { p_action: "settings", p_kind: "safety", p_target: key, p_label: `${key === "words" ? "Scam words" : "Protected names"}: ${clean.length}` });
  revalidatePath("/moderation");
  return { ok: true };
}

// ---------------------------------------------------------------- "You're leaving SME Hub"

export type LinkVerdict = { domain: string; blocked: boolean; why: string; lookalike: boolean; trusted: boolean };

/** Checked again at click time, because a site can turn bad after it was posted. */
export async function checkLink(url: string): Promise<LinkVerdict> {
  const domain = domainOf(url);
  const empty = { domain, blocked: false, why: "", lookalike: false, trusted: false };
  if (!domain.includes(".") || !DOMAIN.test(domain)) return empty;
  const v = await getViewer();
  // each check can cost a Web Risk lookup: 120 an hour per member or connection is plenty for real clicks
  const who = v.userId ?? (((await headers()).get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown");
  const { data: ok } = await v.supabase.rpc("rate_hit", { p_key: `link:${who}`, p_max: 120, p_window: "1 hour" });
  if (ok === false) {
    const { data: why } = await v.supabase.rpc("site_block_reason", { p_domain: domain });
    return typeof why === "string" && why ? { domain, blocked: true, why, lookalike: why.startsWith("Look-alike"), trusted: false } : empty;
  }
  const r = await checkSite(domain);
  if (r.blocked) return { domain, blocked: true, why: r.why, lookalike: r.lookalike, trusted: false };
  if (!v.userId) return empty;
  const { data } = await v.supabase.from("link_trust").select("domain").eq("user_id", v.userId).eq("domain", domain).maybeSingle();
  return { ...empty, trusted: !!data };
}

/** The sites this member said not to warn about (the leaving screen skips them). */
export async function myTrustedSites(): Promise<string[]> {
  const v = await getViewer();
  if (!v.userId) return [];
  const { data } = await v.supabase.from("link_trust").select("domain").eq("user_id", v.userId).limit(500);
  return ((data ?? []) as { domain: string }[]).map((r) => r.domain);
}

// ---------------------------------------------------------------- the scam-message warning

/** "Report" on a scam warning: the sender goes to the team's Flagged members with the message attached. */
export async function reportScamMessage(senderId: string, body: string): Promise<Done> {
  const v = await getViewer();
  if (!v.userId || !isId(senderId) || senderId === v.userId) return { error: "Not allowed." };
  const { error } = await v.supabase.from("reports").insert({ reporter_id: v.userId, profile_id: senderId, reason: "Scam or phishing message", note: String(body ?? "").slice(0, 1000) });
  if (error && !/duplicate/i.test(error.message)) return { error: "Your report didn’t send. Try again." };
  return { ok: true };
}

/** "Block" on a scam warning: they can't message you or see your profile, and any connection ends. */
export async function blockSender(senderId: string): Promise<Done> {
  const v = await getViewer();
  if (!v.userId || !isId(senderId) || senderId === v.userId) return { error: "Not allowed." };
  const { error } = await v.supabase.from("blocks").upsert({ blocker_id: v.userId, blocked_id: senderId }, { ignoreDuplicates: true });
  if (error) return { error: "That didn’t save. Try again." };
  await v.supabase.from("connections").delete().or(`and(requester_id.eq.${v.userId},addressee_id.eq.${senderId}),and(requester_id.eq.${senderId},addressee_id.eq.${v.userId})`);
  revalidatePath("/messages");
  return { ok: true };
}
