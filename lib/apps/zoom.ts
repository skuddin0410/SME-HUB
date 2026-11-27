import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { open, seal, secretBoxReady } from "./secret-box";

/**
 * Update 36: an SME Advisor's own Zoom (a user-managed Zoom OAuth app). Server settings, in AWS Amplify only:
 *   ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET   the OAuth app's credentials
 *   ZOOM_WEBHOOK_SECRET                  the app's event "secret token" (for the deauthorization notice)
 *   TOKEN_ENC_KEY                        encrypts the tokens before they are stored (see secret-box.ts)
 * Scopes: meeting:write:meeting, meeting:update:meeting, meeting:delete:meeting, meeting:read:meeting,
 * meeting:write:registrant, meeting:read:list_registrants, user:read:user, report:read:list_meeting_participants,
 * cloud_recording:read:list_recording_files.
 */
const API = "https://api.zoom.us/v2";
const OAUTH = "https://zoom.us/oauth";

export const zoomConfigured = () => !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET && secretBoxReady() && process.env.SUPABASE_SERVICE_ROLE_KEY);
const basic = () => "Basic " + Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");

export function zoomAuthorizeUrl(state: string, redirect: string) {
  const u = new URL(`${OAUTH}/authorize`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.ZOOM_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("state", state);
  return u.toString();
}

type Tokens = { access_token: string; refresh_token: string; expires_in: number };

async function tokenCall(params: Record<string, string>): Promise<Tokens> {
  const r = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { Authorization: basic(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const j = (await r.json().catch(() => ({}))) as Partial<Tokens> & { error?: string; reason?: string };
  if (!r.ok || !j.access_token || !j.refresh_token) throw new ZoomError(j.error ?? `token ${r.status}`, r.status, j.error === "invalid_grant");
  return j as Tokens;
}

export class ZoomError extends Error {
  constructor(message: string, readonly status?: number, readonly revoked = false) {
    super(message);
    this.name = "ZoomError";
  }
}

/** Finishes the Zoom sign-in: stores who connected and the encrypted tokens. */
export async function zoomConnect(userId: string, code: string, redirect: string): Promise<{ email: string }> {
  const db = serviceClient();
  if (!db) throw new ZoomError("no service key");
  const t = await tokenCall({ grant_type: "authorization_code", code, redirect_uri: redirect });
  const me = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${t.access_token}` }, signal: AbortSignal.timeout(10000) });
  const u = (await me.json().catch(() => ({}))) as { id?: string; email?: string; type?: number };
  if (!me.ok || !u.id) throw new ZoomError(`users/me ${me.status}`, me.status);
  const { error } = await db.from("advisor_zoom").upsert({
    user_id: userId,
    zoom_user_id: String(u.id).slice(0, 64),
    email: String(u.email ?? "").slice(0, 254),
    account_type: Number(u.type) || 1,
    refresh_enc: seal(t.refresh_token),
    access_enc: seal(t.access_token),
    access_expires: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    lease_until: null,
    connected_at: new Date().toISOString(),
  });
  if (error) throw new ZoomError(error.message);
  return { email: String(u.email ?? "") };
}

type Row = { user_id: string; refresh_enc: string; access_enc: string | null; access_expires: string | null; lease_until: string | null };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A working access token for the Advisor, refreshed when it has expired. Only one server refreshes at a time. */
async function access(userId: string): Promise<string> {
  const db = serviceClient();
  if (!db) throw new ZoomError("no service key");
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data } = await db.from("advisor_zoom").select("user_id, refresh_enc, access_enc, access_expires, lease_until").eq("user_id", userId).maybeSingle();
    const row = data as Row | null;
    if (!row) throw new ZoomError("not connected", 404, true);
    if (row.access_enc && row.access_expires && Date.parse(row.access_expires) > Date.now()) return open(row.access_enc);
    // take the lease, so two requests don't both spend the (single-use) refresh token
    const now = new Date().toISOString();
    const { data: got } = await db
      .from("advisor_zoom")
      .update({ lease_until: new Date(Date.now() + 20000).toISOString() })
      .eq("user_id", userId)
      .or(`lease_until.is.null,lease_until.lt.${now}`)
      .select("user_id");
    if (!got?.length) {
      await sleep(700);
      continue;
    }
    try {
      const t = await tokenCall({ grant_type: "refresh_token", refresh_token: open(row.refresh_enc) });
      await db.from("advisor_zoom").update({
        refresh_enc: seal(t.refresh_token),
        access_enc: seal(t.access_token),
        access_expires: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
        lease_until: null,
      }).eq("user_id", userId);
      return t.access_token;
    } catch (e) {
      if (e instanceof ZoomError && e.revoked) await db.from("advisor_zoom").delete().eq("user_id", userId);
      else await db.from("advisor_zoom").update({ lease_until: null }).eq("user_id", userId);
      throw e;
    }
  }
  throw new ZoomError("token busy");
}

async function call<T>(userId: string, method: string, path: string, body?: unknown): Promise<T> {
  const tok = await access(userId);
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${tok}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  if (r.status === 204) return {} as T;
  const j = (await r.json().catch(() => ({}))) as T & { message?: string; code?: number };
  if (!r.ok) throw new ZoomError(j.message ?? `${method} ${path} ${r.status}`, r.status);
  return j;
}

/** Zoom wants local wall time plus a time zone, or UTC with a Z. We send UTC. */
const zTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export type MeetingIn = { topic: string; agenda?: string; start: Date; minutes: number; waitingRoom: boolean; registration: boolean; record: boolean };
export async function createMeeting(userId: string, m: MeetingIn): Promise<{ id: string; join_url: string }> {
  const j = await call<{ id: number; join_url: string }>(userId, "POST", "/users/me/meetings", {
    topic: m.topic.slice(0, 200),
    agenda: (m.agenda ?? "").slice(0, 2000),
    type: 2,
    start_time: zTime(m.start),
    duration: Math.max(1, Math.round(m.minutes)),
    timezone: "UTC",
    settings: {
      waiting_room: m.waitingRoom,
      join_before_host: false,
      ...(m.registration ? { approval_type: 0, registration_type: 1, registrants_email_notification: false, registrants_confirmation_email: false } : { approval_type: 2 }),
      auto_recording: m.record ? "cloud" : "none",
    },
  });
  return { id: String(j.id), join_url: j.join_url };
}

export async function updateMeeting(userId: string, id: string, m: Partial<MeetingIn>) {
  await call(userId, "PATCH", `/meetings/${encodeURIComponent(id)}`, {
    ...(m.topic ? { topic: m.topic.slice(0, 200) } : {}),
    ...(m.start ? { start_time: zTime(m.start), timezone: "UTC" } : {}),
    ...(m.minutes ? { duration: Math.round(m.minutes) } : {}),
  });
}

export async function deleteMeeting(userId: string, id: string) {
  try {
    await call(userId, "DELETE", `/meetings/${encodeURIComponent(id)}?schedule_for_reminder=false&cancel_meeting_reminder=false`);
  } catch (e) {
    if (!(e instanceof ZoomError && e.status === 404)) throw e; // already gone is fine
  }
}

/** Each person's own link (only when the meeting takes registrations). */
export async function addRegistrant(userId: string, meetingId: string, p: { email: string; name: string }): Promise<{ join_url: string; registrant_id: string }> {
  const [first, ...rest] = (p.name || "Member").trim().split(/\s+/);
  const j = await call<{ join_url: string; registrant_id: string }>(userId, "POST", `/meetings/${encodeURIComponent(meetingId)}/registrants`, {
    email: p.email,
    first_name: (first || "Member").slice(0, 64),
    last_name: rest.join(" ").slice(0, 64) || undefined,
  });
  return { join_url: j.join_url, registrant_id: String(j.registrant_id ?? "") };
}

/** The host's start link expires, so it is fetched fresh each time and never stored. */
export async function startUrl(userId: string, meetingId: string): Promise<string> {
  const j = await call<{ start_url?: string }>(userId, "GET", `/meetings/${encodeURIComponent(meetingId)}`);
  if (!j.start_url) throw new ZoomError("no start url");
  return j.start_url;
}

/** After the meeting: who came and for how long (needs a paid Zoom plan; null when Zoom won't say). */
export async function meetingReport(userId: string, meetingId: string): Promise<{ attended: number; minutes: number } | null> {
  try {
    const j = await call<{ participants?: { id?: string; user_email?: string; name?: string; join_time?: string; leave_time?: string }[] }>(
      userId, "GET", `/report/meetings/${encodeURIComponent(meetingId)}/participants?page_size=300`,
    );
    const ps = j.participants ?? [];
    if (!ps.length) return null;
    const who = new Set(ps.map((p) => p.user_email || p.id || p.name));
    const t0 = Math.min(...ps.map((p) => Date.parse(p.join_time ?? "")).filter(Number.isFinite));
    const t1 = Math.max(...ps.map((p) => Date.parse(p.leave_time ?? "")).filter(Number.isFinite));
    return { attended: Math.max(0, who.size - 1), minutes: Number.isFinite(t0) && Number.isFinite(t1) ? Math.round((t1 - t0) / 60000) : 0 };
  } catch {
    return null;
  }
}

/** The cloud recording's share link, when there is one. */
export async function recordingLink(userId: string, meetingId: string): Promise<string | null> {
  try {
    const j = await call<{ share_url?: string }>(userId, "GET", `/meetings/${encodeURIComponent(meetingId)}/recordings`);
    return j.share_url ?? null;
  } catch {
    return null;
  }
}

/** Disconnect: revoke the token at Zoom, then forget it. Upcoming meetings stay in the Advisor's Zoom. */
export async function zoomDisconnect(userId: string) {
  const db = serviceClient();
  if (!db) return;
  const { data } = await db.from("advisor_zoom").select("refresh_enc").eq("user_id", userId).maybeSingle();
  const enc = (data as { refresh_enc?: string } | null)?.refresh_enc;
  if (enc) {
    try {
      await fetch(`${OAUTH}/revoke?token=${encodeURIComponent(open(enc))}`, { method: "POST", headers: { Authorization: basic() }, signal: AbortSignal.timeout(8000) });
    } catch {
      /* forgetting it here is what matters */
    }
  }
  await db.from("advisor_zoom").delete().eq("user_id", userId);
}

/** Someone cancelled their registration: their personal link stops working. */
export async function cancelRegistrant(userId: string, meetingId: string, registrantId: string, email: string) {
  try {
    await call(userId, "PUT", `/meetings/${encodeURIComponent(meetingId)}/registrants/status`, { action: "cancel", registrants: [{ id: registrantId, email }] });
  } catch {
    /* the link row is removed anyway */
  }
}
