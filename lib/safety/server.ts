import "server-only";
import { serviceClient } from "@/lib/supabase/service";

/**
 * Update 41: Safety and trust, the server half.
 * The database enforces the member limits (welcome week, daily caps, held for review). This file does the checks that
 * need a secret key: Cloudflare Turnstile (the invisible human check) and Google Web Risk (dangerous links).
 * Keys live only in AWS Amplify: TURNSTILE_SECRET_KEY, WEBRISK_API_KEY (and NEXT_PUBLIC_TURNSTILE_SITE_KEY for the widget).
 */

export type SafetyCfg = {
  bot: boolean; code: boolean; throwaway: boolean; perIp: number; days: number; fast: number; links: boolean; conn: number; msgs: number;
  groups: boolean; offers: boolean; allConn: number; allMsgs: number; posts: number; dupes: number; webrisk: boolean; leave: boolean; twostep: boolean; paidLinks: boolean;
};
export const CFG_DEFAULT: SafetyCfg = {
  bot: true, code: true, throwaway: true, perIp: 3, days: 7, fast: 3, links: false, conn: 10, msgs: 20, groups: false, offers: false,
  allConn: 50, allMsgs: 100, posts: 5, dupes: 3, webrisk: true, leave: true, twostep: true, paidLinks: false,
};

let cache: { at: number; cfg: SafetyCfg } | null = null;

/** The team's Safety rules (cached for a minute per server). Falls back to the defaults if the database can't be read. */
export async function safetyCfg(): Promise<SafetyCfg> {
  if (cache && Date.now() - cache.at < 60_000) return cache.cfg;
  const db = serviceClient();
  if (!db) return CFG_DEFAULT;
  const { data } = await db.from("safety_config").select("cfg").eq("id", 1).maybeSingle();
  const cfg = { ...CFG_DEFAULT, ...((data?.cfg as Partial<SafetyCfg> | undefined) ?? {}) };
  cache = { at: Date.now(), cfg };
  return cfg;
}
export function forgetSafetyCfg() {
  cache = null;
}

/** Is the invisible human check on? Needs both keys in Amplify and the team's switch. */
export async function humanCheckOn() {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) return false;
  return (await safetyCfg()).bot;
}

/** Checks a Turnstile token with Cloudflare. True when the check is off. */
export async function humanOk(token: string | undefined | null, ip: string): Promise<boolean> {
  if (!(await humanCheckOn())) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(6000), cache: "no-store" });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch (e) {
    // Cloudflare unreachable: let real people through rather than lock everyone out; the other checks still run
    console.error("turnstile:", (e as Error).message);
    return true;
  }
}

/** "priya.s***@gmail.com", never the whole address in the team's log. */
export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  if (!domain) return "";
  const keep = Math.max(1, Math.min(7, Math.floor(local.length / 2)));
  return `${local.slice(0, keep)}***@${domain}`.slice(0, 120);
}

export function countryOf(h: Headers) {
  return (h.get("cloudfront-viewer-country") || h.get("cf-ipcountry") || "").toUpperCase().slice(0, 2);
}

/** One line in the team's Sign-ups tab (kept 90 days). */
export async function logSignup(email: string, outcome: "allowed" | "blocked", reason: string, country: string) {
  const db = serviceClient();
  if (!db) return;
  await db.from("signup_log").insert({ email_masked: email ? maskEmail(email) : "", outcome, reason: reason.slice(0, 120), country });
}

/** Temporary-inbox address that the team hasn't allowed. */
export async function isThrowaway(email: string) {
  const db = serviceClient();
  if (!db) return false;
  const { data } = await db.rpc("email_is_throwaway", { p_email: email });
  return data === true;
}

/** "safety: Links unlock after…" from the database becomes the sentence after the prefix; anything else: null. */
export function safetyMessage(err: { message?: string } | null | undefined): string | null {
  const m = err?.message ?? "";
  const i = m.indexOf("safety: ");
  return i >= 0 ? m.slice(i + 8).trim() : null;
}

// ---------------------------------------------------------------- links

export function domainOf(u: string) {
  return String(u || "").trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0].replace(/\.$/, "");
}
export function isOwnDomain(d: string) {
  return /(^|\.)smehub\.ca$|(^|\.)canadiansme\.ca$/.test(d);
}

const LINKS = /((?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|ca|net|org|io|co|xyz|biz|info|ly|me|app|shop|online|site|link|click|top)\b[^\s<>"']*)/gi;
export function domainsIn(text: string) {
  return [...new Set([...String(text || "").matchAll(LINKS)].map((m) => domainOf(m[1])).filter((d) => d.includes(".")))];
}

type Verdict = { blocked: false } | { blocked: true; why: string; lookalike: boolean };

/**
 * Is this site blocked? The team's list and look-alikes (in the database), then Google Web Risk (30-minute cache, as its
 * terms ask). A site Web Risk flags is added to Blocked sites automatically, so the database stops it everywhere.
 */
export async function checkSite(domain: string): Promise<Verdict> {
  const d = domainOf(domain);
  if (!d || isOwnDomain(d)) return { blocked: false };
  const db = serviceClient();
  if (!db) return { blocked: false };
  const { data: why } = await db.rpc("site_block_reason", { p_domain: d });
  if (typeof why === "string" && why) return { blocked: true, why, lookalike: why.startsWith("Look-alike") };
  const { data: allowed } = await db.from("allowed_sites").select("domain").eq("domain", d).maybeSingle();
  if (allowed) return { blocked: false };
  const bad = await webRisk(d);
  if (bad) {
    const label = bad === "SOCIAL_ENGINEERING" ? "Phishing (Google Web Risk)" : bad === "MALWARE" ? "Malware (Google Web Risk)" : "Spam (Google Web Risk)";
    await db.from("blocked_sites").upsert({ domain: d, why: label, added_by: null }, { onConflict: "domain", ignoreDuplicates: true });
    return { blocked: true, why: label, lookalike: false };
  }
  return { blocked: false };
}

async function webRisk(d: string): Promise<string | null> {
  const key = process.env.WEBRISK_API_KEY;
  if (!key || !(await safetyCfg()).webrisk) return null;
  const db = serviceClient();
  if (db) {
    const { data } = await db.from("link_cache").select("bad, checked_at").eq("domain", d).maybeSingle();
    if (data && Date.now() - new Date(data.checked_at as string).getTime() < 30 * 60_000) return (data.bad as string | null) ?? null;
  }
  try {
    const q = new URLSearchParams({ uri: `http://${d}/`, key });
    for (const t of ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"]) q.append("threatTypes", t);
    const r = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${q}`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!r.ok) throw new Error(`Web Risk ${r.status}`);
    const j = (await r.json()) as { threat?: { threatTypes?: string[] } };
    const bad = j.threat?.threatTypes?.[0] ?? null;
    if (db) await db.from("link_cache").upsert({ domain: d, bad, checked_at: new Date().toISOString() });
    return bad;
  } catch (e) {
    console.error("webrisk:", (e as Error).message);
    return null;
  }
}

/** Checks every link in a piece of text before it is saved, so Web Risk finds are on the blocked list when the database checks it. */
export async function screenLinks(text: string) {
  const ds = domainsIn(text).filter((d) => !isOwnDomain(d)).slice(0, 10);
  await Promise.all(ds.map((d) => checkSite(d).catch(() => null)));
}

/** The protected name ("SME Hub", "Support"…) a name uses, or null. */
export async function protectedName(name: string): Promise<string | null> {
  const db = serviceClient();
  if (!db || !name.trim()) return null;
  const { data } = await db.rpc("safety_name_taken", { p_name: name });
  return typeof data === "string" && data ? data : null;
}
