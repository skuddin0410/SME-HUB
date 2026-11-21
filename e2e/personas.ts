// The people every check is run as (see the Test plan sheet). Signed-in personas are added as the
// phases that need them land; for now the public site is checked as a visitor.
export const SCREEN_WIDTHS = [390, 768, 1024, 1280, 1440] as const;

export const PUBLIC_PAGES = [
  "/auth/login",
  "/auth/sign-up",
  "/about",
  "/help",
  "/contact",
  "/membership-plans",
] as const;

/** A signed-in member for the mock (see mock-supabase.mjs): the cookie the site reads its session from. */
export function memberCookie(baseURL: string) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "00000000-0000-4000-8000-000000000001", role: "authenticated", aud: "authenticated", exp: 4102444800, iat: 1700000000 })}.test`;
  const session = { access_token: jwt, refresh_token: "test", token_type: "bearer", expires_in: 3600, expires_at: 4102444800, user: { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated" } };
  return { name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: baseURL };
}
