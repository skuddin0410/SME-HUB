import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";

/**
 * "Email code on new devices". After a correct password, a device we have not seen for this account
 * must also enter a 6-digit code we email. It is on only when the server can both store the code safely
 * (SUPABASE_SERVICE_ROLE_KEY) and send it (RESEND_API_KEY), so it can never lock anyone out while email is not set up.
 */
export const DEVICE_COOKIE = "sme_dev";
export const TRUST_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_TRIES = 5;

export const gateReady = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.RESEND_API_KEY);

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const codeHash = (userId: string, code: string) => sha(`${userId}:${code}`);

export const spaced = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`;

/** True when this device was trusted for the account and has not expired. */
export async function isTrusted(userId: string, token: string | undefined) {
  const db = serviceClient();
  if (!db || !token) return false;
  const { data } = await db.from("trusted_devices").select("user_id").eq("user_id", userId).eq("token_hash", sha(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  return Boolean(data);
}

/** Makes a fresh code for the account and stores only its hash. Returns the code to email. */
export async function startChallenge(userId: string) {
  const db = serviceClient();
  if (!db) throw new Error("service key missing");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await db.from("signin_challenges").upsert({
    user_id: userId,
    code_hash: codeHash(userId, code),
    attempts: 0,
    expires_at: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return code;
}

export type Check = "ok" | "wrong" | "expired";

/** Checks a code. Five wrong tries, or ten minutes, end the challenge. A right code is used up. */
export async function checkChallenge(userId: string, code: string): Promise<Check> {
  const db = serviceClient();
  if (!db) return "expired";
  const { data } = await db.from("signin_challenges").select("code_hash, attempts, expires_at").eq("user_id", userId).maybeSingle();
  const row = data as { code_hash: string; attempts: number; expires_at: string } | null;
  if (!row || row.attempts >= MAX_TRIES || new Date(row.expires_at).getTime() < Date.now()) return "expired";
  const a = Buffer.from(row.code_hash);
  const b = Buffer.from(codeHash(userId, code));
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await db.from("signin_challenges").delete().eq("user_id", userId);
    return "ok";
  }
  await db.from("signin_challenges").update({ attempts: row.attempts + 1 }).eq("user_id", userId);
  return row.attempts + 1 >= MAX_TRIES ? "expired" : "wrong";
}

/** Remembers this device for 30 days. Returns the token to put in the cookie. */
export async function trustDevice(userId: string) {
  const db = serviceClient();
  if (!db) return null;
  const token = randomBytes(32).toString("hex");
  const { error } = await db.from("trusted_devices").insert({
    user_id: userId,
    token_hash: sha(token),
    expires_at: new Date(Date.now() + TRUST_DAYS * 86_400_000).toISOString(),
  });
  if (error) return null;
  // tidy up old rows for this account
  await db.from("trusted_devices").delete().eq("user_id", userId).lt("expires_at", new Date().toISOString());
  return token;
}
