import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { open, seal, secretBoxReady } from "./secret-box";

/**
 * Update 36: "Google Calendar: block my busy times". We ask Google only for free/busy (never event details) and
 * the address, so Settings can say who is connected. Server settings, in AWS Amplify only:
 *   GOOGLE_CAL_CLIENT_ID, GOOGLE_CAL_CLIENT_SECRET   a Google OAuth client (Web application)
 * Redirect URI to register at Google: <site>/api/apps/google/callback
 */
const SCOPES = ["https://www.googleapis.com/auth/calendar.freebusy", "openid", "email"];
export const gcalConfigured = () => !!(process.env.GOOGLE_CAL_CLIENT_ID && process.env.GOOGLE_CAL_CLIENT_SECRET && secretBoxReady() && process.env.SUPABASE_SERVICE_ROLE_KEY);

export function gcalAuthorizeUrl(state: string, redirect: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", process.env.GOOGLE_CAL_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "false");
  u.searchParams.set("state", state);
  return u.toString();
}

async function token(params: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CAL_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CAL_CLIENT_SECRET ?? "", ...params }).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; id_token?: string; scope?: string; error?: string };
  if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error ?? `google token ${r.status}`), { revoked: j.error === "invalid_grant" });
  return j;
}

export async function gcalConnect(userId: string, code: string, redirect: string) {
  const db = serviceClient();
  if (!db) throw new Error("no service key");
  const t = await token({ grant_type: "authorization_code", code, redirect_uri: redirect });
  if (!t.refresh_token) throw new Error("no refresh token");
  if (!(t.scope ?? "").includes("calendar.freebusy")) throw new Error("free/busy not allowed");
  // the address comes from the ID token Google just gave us over TLS (no need to verify its signature here)
  let email = "";
  try {
    email = String(JSON.parse(Buffer.from((t.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8")).email ?? "");
  } catch {
    email = "";
  }
  const { error } = await db.from("advisor_gcal").upsert({ user_id: userId, email: email.slice(0, 254), refresh_enc: seal(t.refresh_token), connected_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await db.from("consult_settings").upsert({ advisor_id: userId, gcal: true }, { onConflict: "advisor_id" });
  return { email };
}

/** Busy times between two moments, from the Advisor's primary calendar. Empty when not connected or Google fails. */
export async function gcalBusy(userId: string, from: Date, to: Date): Promise<[number, number][]> {
  const db = serviceClient();
  if (!db || !gcalConfigured()) return [];
  const { data } = await db.from("advisor_gcal").select("refresh_enc").eq("user_id", userId).maybeSingle();
  const enc = (data as { refresh_enc?: string } | null)?.refresh_enc;
  if (!enc) return [];
  try {
    const t = await token({ grant_type: "refresh_token", refresh_token: open(enc) });
    const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: "primary" }] }),
      signal: AbortSignal.timeout(8000),
    });
    const j = (await r.json().catch(() => ({}))) as { calendars?: { primary?: { busy?: { start: string; end: string }[] } } };
    return (j.calendars?.primary?.busy ?? []).map((b) => [Date.parse(b.start), Date.parse(b.end)] as [number, number]).filter(([a, b]) => a < b);
  } catch (e) {
    if ((e as { revoked?: boolean }).revoked) await db.from("advisor_gcal").delete().eq("user_id", userId);
    return [];
  }
}

export async function gcalDisconnect(userId: string) {
  const db = serviceClient();
  if (!db) return;
  const { data } = await db.from("advisor_gcal").select("refresh_enc").eq("user_id", userId).maybeSingle();
  const enc = (data as { refresh_enc?: string } | null)?.refresh_enc;
  if (enc) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(open(enc))}`, { method: "POST", signal: AbortSignal.timeout(8000) });
    } catch {
      /* forgetting it is what matters */
    }
  }
  await db.from("advisor_gcal").delete().eq("user_id", userId);
  await db.from("consult_settings").update({ gcal: false }).eq("advisor_id", userId);
}
