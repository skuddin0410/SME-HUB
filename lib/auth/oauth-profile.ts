import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Sign-in providers whose members skip the sign-up form. */
const SOCIAL = ["google", "linkedin_oidc"];

/** Where providers keep the profile picture; nothing from any other host is fetched. */
const PICTURE_HOSTS = [/(^|\.)googleusercontent\.com$/i, /(^|\.)licdn\.com$/i];
const PICTURE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" };
const PICTURE_MAX = 5 * 1024 * 1024;

export function isSocial(user: User): boolean {
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string];
  return providers.some((p) => SOCIAL.includes(p));
}

/** True until a Google or LinkedIn member has given what the sign-up form asks for. */
export function needsFinish(user: User): boolean {
  const m = user.user_metadata ?? {};
  return isSocial(user) && !(m.business_name && m.province && m.terms_at);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The member's name as the provider sends it: Google uses full_name/name, LinkedIn name or given_name + family_name. */
export function providerName(user: User): string {
  const m = user.user_metadata ?? {};
  const joined = `${str(m.given_name)} ${str(m.family_name)}`.trim();
  return (str(m.full_name) || str(m.name) || joined).slice(0, 80);
}

/**
 * First sign-in with Google or LinkedIn: give the profile the member's real name (the account was made with
 * the start of the email address when the provider's name was not found) and copy their profile picture into
 * the Hub's own storage (the database only accepts pictures stored there). Never throws: sign-in must go on.
 */
export async function fillFromProvider(supabase: SupabaseClient, user: User): Promise<void> {
  if (!isSocial(user)) return;
  try {
    const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
    const profile = data as { full_name: string | null; avatar_url: string | null } | null;
    if (!profile) return;
    const update: Record<string, string> = {};

    const name = providerName(user);
    const emailStart = (user.email ?? "").split("@")[0];
    if (name && (!profile.full_name || profile.full_name === emailStart)) update.full_name = name;

    if (!profile.avatar_url) {
      const url = await copyPicture(supabase, user);
      if (url) update.avatar_url = url;
    }
    if (Object.keys(update).length) await supabase.from("profiles").update(update).eq("id", user.id);
  } catch (e) {
    console.error("provider profile:", (e as Error).message);
  }
}

async function copyPicture(supabase: SupabaseClient, user: User): Promise<string | null> {
  const m = user.user_metadata ?? {};
  let src = str(m.avatar_url) || str(m.picture);
  if (!src) return null;
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !PICTURE_HOSTS.some((h) => h.test(u.hostname))) return null;
  // Google sends a 96 px picture; ask for a sharper one
  if (/googleusercontent\.com$/i.test(u.hostname)) src = src.replace(/=s\d+(-c)?$/, "=s400-c");

  const res = await fetch(src, { redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = PICTURE_TYPES[type];
  if (!ext) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.length || bytes.length > PICTURE_MAX) return null;

  const path = `${user.id}/avatar-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, bytes, { contentType: type, cacheControl: "31536000" });
  if (error) return null;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
