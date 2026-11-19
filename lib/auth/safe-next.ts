/**
 * Where to send someone after a link or form. Only a path on this site is allowed:
 * "/feed" yes, "//evil.com", "/\\evil.com", "https://evil.com" and "javascript:" no.
 */
export function safeNext(asked: string | null | undefined, fallback = "/feed") {
  const value = (asked ?? "").trim();
  if (!/^\/(?![\/\\])/.test(value)) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

/** The path part of a full URL that Supabase sends back as redirect_to, if it points here. */
export function nextFromRedirect(redirectTo: string | null | undefined, siteUrl: string, fallback = "/feed") {
  if (!redirectTo) return fallback;
  try {
    const url = new URL(redirectTo, siteUrl);
    if (url.origin !== new URL(siteUrl).origin) return fallback;
    return safeNext(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}

export const MIN_PASSWORD = 8;

/** Plain-language reason a new password is not acceptable, or null when it is fine. */
export function passwordProblem(password: string, email?: string | null) {
  if (password.length < MIN_PASSWORD) return `Use ${MIN_PASSWORD} or more characters.`;
  if (password.length > 72) return "Use 72 characters or fewer.";
  if (/^(.)\1+$/.test(password)) return "Avoid repeating one character.";
  const local = (email ?? "").split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && password.toLowerCase().includes(local)) return "Do not use your email address in your password.";
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (kinds < 2 && password.length < 14) return "Mix letters with numbers or symbols, or use 14 or more characters.";
  return null;
}
