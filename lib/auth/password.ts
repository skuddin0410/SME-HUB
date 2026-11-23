/**
 * Password rules from the SME Hub sign-in pages (Update 1). The page shows them as the member types;
 * the server checks the same rules again, because the page checks are only a help.
 */
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72; // bcrypt stops reading here

// the handoff's short list, plus the passwords people reach for first
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "letmein1", "letmein123",
  "smbhub123", "smehub123", "smehub2026", "canada123", "canada2026", "iloveyou", "welcome1", "welcome123", "admin123", "abc12345", "11111111", "00000000",
  "monkey123", "dragon123", "football1", "baseball1", "sunshine1", "princess1", "changeme", "changeme123", "hub2026!", "business1", "business123",
]);

export type PasswordChecks = { len: boolean; num: boolean; mix: boolean; common: boolean };

export function passwordChecks(v: string, email?: string | null): PasswordChecks {
  const local = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  return {
    len: v.length >= MIN_PASSWORD,
    num: /\d/.test(v),
    mix: (/[a-z]/.test(v) && /[A-Z]/.test(v)) || /[^A-Za-z0-9]/.test(v),
    // not on the list, and not built from the person's own email name
    common: v.length > 0 && !COMMON.has(v.toLowerCase()) && !(local.length >= 3 && v.toLowerCase().includes(local)),
  };
}

/** 0 (nothing typed) to 4 (strong): how many bars to fill. */
export function passwordScore(v: string, email?: string | null) {
  if (!v) return 0;
  const r = passwordChecks(v, email);
  let s = 0;
  if (r.len) s++;
  if (r.num) s++;
  if (r.mix) s++;
  if (r.common && v.length >= 12) s++;
  if (!r.common) s = 1;
  return Math.max(1, Math.min(4, s));
}

export const SCORE_LABEL = ["", "Too weak", "Fair", "Good", "Strong"] as const;

export function passwordOk(v: string, email?: string | null) {
  const r = passwordChecks(v, email);
  return r.len && r.num && r.mix && r.common && v.length <= MAX_PASSWORD;
}

/** Plain-language reason a new password is not acceptable, or null when it is fine. */
export function passwordProblem(password: string, email?: string | null) {
  if (password.length < MIN_PASSWORD) return `Use ${MIN_PASSWORD} or more characters.`;
  if (password.length > MAX_PASSWORD) return `Use ${MAX_PASSWORD} characters or fewer.`;
  const r = passwordChecks(password, email);
  if (!r.common) return "Choose a password that is harder to guess, and keep your email name out of it.";
  if (!r.num) return "Add at least one number.";
  if (!r.mix) return "Use upper and lower case letters, or add a symbol.";
  return null;
}

/**
 * True when the password has appeared in a known data breach (Have I Been Pwned, k-anonymity: only the
 * first 5 characters of the password's SHA-1 leave our server). If the service cannot be reached the
 * password is allowed, so a third party being down never stops someone changing their password.
 */
export async function isBreached(password: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-1", bytes);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, { headers: { "Add-Padding": "true" }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return false;
    const rest = hex.slice(5);
    return (await res.text()).split("\n").some((line) => {
      const [suffix, count] = line.trim().split(":");
      return suffix === rest && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
