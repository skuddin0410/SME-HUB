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
    // the code-exchange route is only a stop on the way: use where it was going to send people
    if (url.pathname === "/auth/callback") return safeNext(url.searchParams.get("next"), fallback);
    return safeNext(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}

export { MIN_PASSWORD, passwordProblem } from "./password";
