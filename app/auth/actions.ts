"use server";

import { cookies, headers } from "next/headers";
import { createClient as createPlain } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { KEEP_COOKIE, KEEP_SECONDS } from "@/lib/supabase/keep";
import { MAX_PASSWORD, isBreached, passwordOk } from "@/lib/auth/password";
import { siteOrigin } from "@/lib/auth/site";
import { PROVINCES } from "@/lib/auth/provinces";
import { sendWelcomeOnce } from "@/lib/auth/welcome";
import { serviceClient } from "@/lib/supabase/service";
import { checkChallenge, DEVICE_COOKIE, gateReady, isTrusted, spaced, startChallenge, TRUST_DAYS, trustDevice } from "@/lib/auth/device-gate";
import { sendEmail } from "@/lib/email/send";
import { commonVars, renderEmail } from "@/lib/email/render";
import { deviceFromUserAgent, maskIp, NOT_KNOWN, whenET } from "@/lib/email/context";

/**
 * Everything the sign-in pages do on the server (Update 1). The pages check things as the person types,
 * but only these checks count: a page can be skipped, a server action cannot.
 */

export type Fields = Record<string, string>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const BREACHED = "That password has appeared in a data breach. Choose another one.";
const STRONGER = "Choose a stronger password. Follow the tips below.";
const BUSY = "Too many attempts. Wait a minute, then try again.";

async function context() {
  const h = await headers();
  const site = siteOrigin(h, `https://${h.get("host") ?? "localhost"}`);
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  return { h, site, ip, ua: h.get("user-agent") };
}

function firstNameOf(meta: Record<string, unknown> | undefined, fallback?: string) {
  const first = (meta?.first_name as string | undefined) || (meta?.full_name as string | undefined)?.split(" ")[0];
  return first || fallback;
}

/** Security emails must never stop a sign-in or a password change from working. */
async function tryEmail(id: string, to: string, vars: Record<string, unknown>, site: string, first?: string) {
  try {
    const message = await renderEmail(id, { ...commonVars(site, first), email: to, ...vars });
    await sendEmail({ to, ...message });
  } catch (e) {
    console.error(`${id} email:`, (e as Error).message);
  }
}

// ---------------------------------------------------------------- sign up

export type SignUpInput = {
  first: string;
  last: string;
  business: string;
  email: string;
  website: string;
  password: string;
  province: string;
  terms: boolean;
  newsletter: boolean;
};
export type SignUpResult = { ok: true } | { ok: false; fields?: Fields; form?: string; exists?: boolean };

const NEWSLETTER_WORDING = "Send me the free weekly CanadianSME newsletter with small-business news and events. You can unsubscribe anytime.";

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const first = String(input.first ?? "").trim().slice(0, 40);
  const last = String(input.last ?? "").trim().slice(0, 40);
  const business = String(input.business ?? "").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().toLowerCase();
  const website = String(input.website ?? "").trim().slice(0, 200);
  const password = String(input.password ?? "");
  const province = String(input.province ?? "");

  const fields: Fields = {};
  if (!first) fields.fn = "Enter your first name.";
  if (!last) fields.ln = "Enter your last name.";
  if (!business) fields.bn = "Enter your business name.";
  if (!EMAIL.test(email)) fields.em = email ? "Check your email address. It should look like name@business.ca." : "Enter your email address.";
  if (!password) fields.pw = "Create a password.";
  else if (!passwordOk(password, email) || password.length > MAX_PASSWORD) fields.pw = STRONGER;
  if (!PROVINCES.includes(province)) fields.pr = "Choose your province or territory.";
  if (!input.terms) fields.tm = "Please agree to the terms to continue.";
  if (website && !/^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(website)) fields.ws = "Check the website address. It should look like yourbusiness.ca.";
  if (Object.keys(fields).length) return { ok: false, fields };
  if (await isBreached(password)) return { ok: false, fields: { pw: BREACHED } };

  const { site, ip } = await context();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `signup:${ip}`, p_max: 10, p_window: "1 hour" });
  if (allowed === false) return { ok: false, form: BUSY };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: first,
        last_name: last,
        full_name: `${first} ${last}`,
        business_name: business,
        website,
        province,
        ...(input.newsletter ? { newsletter: "true", newsletter_wording: NEWSLETTER_WORDING } : {}),
      },
      emailRedirectTo: `${site}/auth/callback?next=/feed`,
    },
  });
  if (error) {
    if (/rate|seconds/i.test(error.message)) return { ok: false, form: BUSY };
    if (/weak|pwned|leaked/i.test(error.message)) return { ok: false, fields: { pw: BREACHED } };
    if (/already|registered/i.test(error.message)) return { ok: false, exists: true, fields: { em: "exists" } };
    return { ok: false, form: "We could not create your account. Try again in a minute." };
  }
  // Supabase answers an existing, confirmed address with a user that has no identities
  if (data.user && data.user.identities?.length === 0) return { ok: false, exists: true, fields: { em: "exists" } };
  return { ok: true };
}

// ---------------------------------------------------------------- confirm email with a code

export type CodeResult = { ok: true; first?: string } | { ok: false; error: string };

export async function verifyCode(emailIn: string, codeIn: string): Promise<CodeResult> {
  const email = String(emailIn ?? "").trim().toLowerCase();
  const code = String(codeIn ?? "").replace(/\D/g, "");
  if (!EMAIL.test(email) || code.length !== 6) return { ok: false, error: "Enter all 6 digits." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `code:${email}`, p_max: 10, p_window: "15 minutes" });
  if (allowed === false) return { ok: false, error: "Too many tries. Wait a few minutes, or send a new code." };

  let res = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (res.error) res = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
  if (res.error || !res.data.user) {
    return { ok: false, error: "That code isn’t right. Check the latest email from SME Hub, or send a new code." };
  }
  const { site } = await context();
  await sendWelcomeOnce(supabase, res.data.user, site);
  // the person just proved they own the email on this device, so it needs no second code
  if (gateReady()) {
    const token = await trustDevice(res.data.user.id);
    if (token) (await cookies()).set(DEVICE_COOKIE, token, { path: "/", maxAge: TRUST_DAYS * 86_400, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  }
  return { ok: true, first: firstNameOf(res.data.user.user_metadata) };
}

export async function resendCode(emailIn: string): Promise<{ ok: boolean }> {
  const email = String(emailIn ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false };
  const { site } = await context();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `resend:${email}`, p_max: 5, p_window: "1 hour" });
  if (allowed === false) return { ok: false };
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${site}/auth/callback?next=/feed` } });
  return { ok: !error };
}

// ---------------------------------------------------------------- log in

/** Shown on the log-in page for a moment after a successful log-in. */
export type Who = { first: string; avatar: string | null; location: string | null };

export type SignInResult =
  | { status: "ok"; who: Who | null }
  | { status: "wrong"; remaining: number }
  | { status: "locked" }
  | { status: "unconfirmed" }
  | { status: "code" }
  | { status: "invalid"; fields: Fields }
  | { status: "busy" };

export async function signIn(input: { email: string; password: string; keep: boolean }): Promise<SignInResult> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const password = String(input.password ?? "");
  const keep = input.keep !== false;
  if (!EMAIL.test(email)) return { status: "invalid", fields: { em: email ? "Check your email address." : "Enter your email address." } };
  if (!password) return { status: "invalid", fields: { pw: "Enter your password." } };

  const supabase = await createClient({ keep });
  const { data: state } = await supabase.rpc("login_state", { p_email: email });
  const until = (state as { locked_until: string | null }[] | null)?.[0]?.locked_until;
  if (until && new Date(until).getTime() > Date.now()) return { status: "locked" };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/not confirmed/i.test(error.message)) return { status: "unconfirmed" };
    if (/rate|seconds/i.test(error.message)) return { status: "busy" };
    const { data } = await supabase.rpc("login_failed", { p_email: email });
    const row = (data as { locked: boolean; remaining: number; has_account: boolean }[] | null)?.[0];
    if (row?.locked) {
      if (row.has_account) {
        const { site, ua } = await context();
        await tryEmail("account-locked", email, { changed_at: whenET(), device: deviceFromUserAgent(ua), location: NOT_KNOWN, lock_minutes: 15, forgot_url: `${site}/auth/forgot-password` }, site);
      }
      return { status: "locked" };
    }
    return { status: "wrong", remaining: row?.remaining ?? 4 };
  }

  // a device we have not seen for this account also needs the emailed code (when that is switched on and can be sent)
  if (gateReady()) {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: sec } = await supabase.from("user_security").select("email_code").eq("user_id", u.user.id).maybeSingle();
      const wanted = (sec as { email_code?: boolean } | null)?.email_code !== false;
      const jar = await cookies();
      if (wanted && !(await isTrusted(u.user.id, jar.get(DEVICE_COOKIE)?.value))) {
        const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `signin-code:${email}`, p_max: 5, p_window: "1 hour" });
        if (allowed === false) {
          await supabase.auth.signOut({ scope: "local" });
          return { status: "busy" };
        }
        const code = await startChallenge(u.user.id);
        const { site, ua } = await context();
        await tryEmail("signin-code", email, { signin_code: spaced(code), changed_at: whenET(), device: deviceFromUserAgent(ua), location: NOT_KNOWN, reset_url: `${site}/auth/forgot-password` }, site, firstNameOf(u.user.user_metadata));
        // no session yet: the person gets one after the code, with the password checked again
        await supabase.auth.signOut({ scope: "local" });
        return { status: "code" };
      }
    }
  }
  await finishSignIn(supabase, keep);
  return { status: "ok", who: await whoIs(supabase) };
}

/** The member's first name, photo and location, for the welcome moment. Never fails the log-in. */
async function whoIs(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Who | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data } = await supabase.from("profiles").select("full_name, avatar_url, location").eq("id", u.user.id).maybeSingle();
    const p = data as { full_name?: string | null; avatar_url?: string | null; location?: string | null } | null;
    const first = (p?.full_name ?? "").trim().split(/\s+/)[0] || firstNameOf(u.user.user_metadata) || "";
    return { first, avatar: p?.avatar_url || null, location: p?.location || null };
  } catch {
    return null;
  }
}

async function finishSignIn(supabase: Awaited<ReturnType<typeof createClient>>, keep: boolean) {
  const jar = await cookies();
  // unticked = a cookie that ends with the browser session; ticked = the 30-day cookie the session already got
  if (keep) jar.set(KEEP_COOKIE, "1", { path: "/", maxAge: KEEP_SECONDS, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  else jar.set(KEEP_COOKIE, "0", { path: "/", sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  await supabase.rpc("login_succeeded");
}

/** Second step of a log-in from a new device: the password again, plus the emailed code. */
export async function confirmDevice(input: { email: string; password: string; code: string; trust: boolean; keep: boolean }): Promise<{ ok: true; who: Who | null } | { ok: false; error: string }> {
  const email = String(input.email ?? "").trim().toLowerCase();
  const code = String(input.code ?? "").replace(/\D/g, "");
  const keep = input.keep !== false;
  if (code.length !== 6) return { ok: false, error: "Enter all 6 digits." };
  const supabase = await createClient({ keep });
  const { data: state } = await supabase.rpc("login_state", { p_email: email });
  const until = (state as { locked_until: string | null }[] | null)?.[0]?.locked_until;
  if (until && new Date(until).getTime() > Date.now()) return { ok: false, error: "Logging in is paused for 15 minutes. You can reset your password now instead." };

  const { error } = await supabase.auth.signInWithPassword({ email, password: String(input.password ?? "") });
  if (error) return { ok: false, error: "That didn’t work. Go back and log in again." };
  const { data: u } = await supabase.auth.getUser();
  const result = u.user ? await checkChallenge(u.user.id, code) : "expired";
  if (result !== "ok" || !u.user) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      ok: false,
      error: result === "wrong" ? "That code isn’t right. Check the latest email from SME Hub." : "That code has expired. Go back and log in again to get a new one.",
    };
  }
  if (input.trust) {
    const token = await trustDevice(u.user.id);
    if (token) (await cookies()).set(DEVICE_COOKIE, token, { path: "/", maxAge: TRUST_DAYS * 86_400, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  }
  await finishSignIn(supabase, keep);
  return { ok: true, who: await whoIs(supabase) };
}

// ---------------------------------------------------------------- forgot password

export async function forgotPassword(emailIn: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = String(emailIn ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: email ? "Check your email address." : "Enter your email address." };
  const { site, ip } = await context();
  const supabase = await createClient();
  // 5 requests an hour for each address and each IP, so the form cannot be used to flood anyone's inbox
  const [a, b] = await Promise.all([
    supabase.rpc("rate_hit", { p_key: `reset:${email}`, p_max: 5, p_window: "1 hour" }),
    supabase.rpc("rate_hit", { p_key: `reset-ip:${ip}`, p_max: 5, p_window: "1 hour" }),
  ]);
  if (a.data === false || b.data === false) return { ok: false, error: "Too many requests. Try again in an hour." };
  // same answer whether or not the account exists, so the form cannot be used to find members
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site}/auth/confirm?next=/auth/update-password` });
  return { ok: true };
}

// ---------------------------------------------------------------- new password (from the email link)

export type PasswordResult = { ok: true; others: boolean } | { ok: false; fields: Fields };

export async function resetPassword(input: { password: string; confirm: string; signOutOthers: boolean }): Promise<PasswordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, fields: { form: "expired" } };
  const done = await savePassword(supabase, user, input.password, input.confirm);
  if (!done.ok) return done;
  if (input.signOutOthers) await supabase.auth.signOut({ scope: "others" });
  // the person logs in again with the new password: that is what the "Log in" button on the next screen means
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true, others: input.signOutOthers };
}

async function savePassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { email?: string | null; user_metadata?: Record<string, unknown> },
  password: string,
  confirm: string,
  currentPassword?: string,
): Promise<{ ok: true } | { ok: false; fields: Fields }> {
  const pw = String(password ?? "");
  if (!passwordOk(pw, user.email) || pw.length > MAX_PASSWORD) return { ok: false, fields: { pw: pw ? STRONGER : "Enter a new password." } };
  if (currentPassword !== undefined && pw === currentPassword) return { ok: false, fields: { pw: "Your new password must be different from your current one." } };
  if (pw !== confirm) return { ok: false, fields: { pw2: confirm ? "The passwords don’t match." : "Type your new password again." } };
  if (await isBreached(pw)) return { ok: false, fields: { pw: BREACHED } };

  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) {
    if (/different from the old/i.test(error.message)) return { ok: false, fields: { pw: "Choose a password you have not used for this account." } };
    if (/weak|pwned|leaked/i.test(error.message)) return { ok: false, fields: { pw: BREACHED } };
    return { ok: false, fields: { form: "We could not save your password. Try again in a minute." } };
  }
  const { site, ua } = await context();
  if (user.email) {
    await tryEmail(
      "password-changed",
      user.email,
      { changed_at: whenET(), device: deviceFromUserAgent(ua), location: NOT_KNOWN, secure_url: `${site}/auth/forgot-password` },
      site,
      firstNameOf(user.user_metadata),
    );
  }
  return { ok: true };
}

// ---------------------------------------------------------------- settings: password, sessions, sign-in methods

export async function changePassword(input: { current: string; password: string; confirm: string; signOutOthers: boolean }): Promise<PasswordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, fields: { form: "Log in again to change your password." } };
  const current = String(input.current ?? "");
  if (!current) return { ok: false, fields: { cur: "Enter your current password." } };

  const first = await savePasswordChecks(user.email, input);
  if (first) return { ok: false, fields: first };

  // is the "current password" right? A throwaway client, so no session is added to the account
  const probe = createPlain(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: state } = await supabase.rpc("login_state", { p_email: user.email });
  const until = (state as { locked_until: string | null }[] | null)?.[0]?.locked_until;
  if (until && new Date(until).getTime() > Date.now()) return { ok: false, fields: { cur: "Too many wrong passwords. Try again in 15 minutes, or reset your password." } };
  const test = await probe.auth.signInWithPassword({ email: user.email, password: current });
  if (test.error || !test.data.session) {
    await supabase.rpc("login_failed", { p_email: user.email });
    return { ok: false, fields: { cur: "That’s not your current password." } };
  }
  await probe.auth.signOut({ scope: "local" }); // removes the session the check created

  const done = await savePassword(supabase, user, input.password, input.confirm, current);
  if (!done.ok) return done;
  if (input.signOutOthers) await supabase.auth.signOut({ scope: "others" });
  return { ok: true, others: input.signOutOthers };
}

/** The checks that do not need the database, run before the current password is tried. */
async function savePasswordChecks(email: string, input: { current: string; password: string; confirm: string }): Promise<Fields | null> {
  const pw = String(input.password ?? "");
  if (!passwordOk(pw, email) || pw.length > MAX_PASSWORD) return { pw: pw ? STRONGER : "Enter a new password." };
  if (pw === input.current) return { pw: "Your new password must be different from your current one." };
  if (pw !== input.confirm) return { pw2: input.confirm ? "The passwords don’t match." : "Type your new password again." };
  return null;
}

export type SessionRow = { id: string; device: string; where: string; lastSeen: string; current: boolean };

export async function listSessions(): Promise<SessionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_sessions");
  return ((data as { id: string; user_agent: string | null; ip: string | null; last_seen: string; is_current: boolean }[] | null) ?? []).map((s) => ({
    id: s.id,
    device: deviceFromUserAgent(s.user_agent),
    where: maskIp(s.ip),
    lastSeen: s.last_seen,
    current: s.is_current,
  }));
}

export async function endSession(id: string): Promise<{ ok: boolean }> {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false };
  const { error } = await (await createClient()).rpc("end_session", { p_id: id });
  return { ok: !error };
}

export async function endOtherSessions(): Promise<{ ok: boolean }> {
  const { error } = await (await createClient()).rpc("end_other_sessions");
  return { ok: !error };
}

export async function setEmailCode(on: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("user_security").upsert({ user_id: user.id, email_code: Boolean(on), updated_at: new Date().toISOString() });
  return { ok: !error };
}

// ---------- Finish your profile (Google and LinkedIn members) ----------
export type FinishInput = { first: string; last: string; business: string; website: string; province: string; terms: boolean; newsletter: boolean };

/**
 * Google and LinkedIn members skip the sign-up form, so they give its details once, on their first visit:
 * the same fields and checks as the form, minus email and password. Stored where sign-up stores them.
 */
export async function finishProfile(input: FinishInput): Promise<{ ok: true } | { ok: false; fields?: Fields; form?: string }> {
  const first = String(input.first ?? "").trim().slice(0, 40);
  const last = String(input.last ?? "").trim().slice(0, 40);
  const business = String(input.business ?? "").trim().slice(0, 120);
  let website = String(input.website ?? "").trim().slice(0, 200);
  const province = String(input.province ?? "");
  const fields: Fields = {};
  if (!first) fields.fn = "Enter your first name.";
  if (!last) fields.ln = "Enter your last name.";
  if (!business) fields.bn = "Enter your business name.";
  if (!PROVINCES.includes(province)) fields.pr = "Choose your province or territory.";
  if (!input.terms) fields.tm = "Please agree to the terms to continue.";
  if (website && !/^(https?:\/\/)?[^\s/$.?#][^\s]*\.[^\s]{2,}$/i.test(website)) fields.ws = "Check the website address. It should look like yourbusiness.ca.";
  if (Object.keys(fields).length) return { ok: false, fields };
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, form: "Your session has ended. Log in again." };

  const { error } = await supabase.auth.updateUser({
    data: {
      first_name: first,
      last_name: last,
      full_name: `${first} ${last}`,
      business_name: business,
      website,
      province,
      terms_at: new Date().toISOString(),
      ...(input.newsletter ? { newsletter: "true", newsletter_wording: NEWSLETTER_WORDING } : {}),
    },
  });
  if (error) return { ok: false, form: "We couldn’t save that. Try again in a moment." };
  await supabase.from("profiles").update({ full_name: `${first} ${last}`.slice(0, 80), ...(website ? { website } : {}) }).eq("id", user.id);
  // the province fills the profile's location only when the member hasn't set one
  await supabase.from("profiles").update({ location: province }).eq("id", user.id).is("location", null);

  // the newsletter list is written only by the server, as at sign-up
  if (input.newsletter) {
    const admin = serviceClient();
    if (admin) {
      const { data: had } = await admin.from("newsletter_consents").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!had) await admin.from("newsletter_consents").insert({ user_id: user.id, wording: NEWSLETTER_WORDING });
    }
  }
  return { ok: true };
}
