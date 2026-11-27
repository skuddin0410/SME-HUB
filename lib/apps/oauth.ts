import "server-only";
import { headers, cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "node:crypto";

/** The site's own address (the OAuth redirect must match what is registered at Zoom and Google). */
export async function siteOrigin() {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/** Only pages on this site, so a crafted link can't send the Advisor elsewhere after connecting. */
export const safeNext = (n: string | null | undefined, fallback: string) => (n && /^\/[A-Za-z0-9/_?=&%-]*$/.test(n) && !n.startsWith("//") ? n : fallback);

/** A one-time state value in a short-lived cookie, checked on the way back (stops cross-site connect requests). */
export async function newState(name: string, next: string) {
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set(name, `${state}|${next}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/apps", maxAge: 600 });
  return state;
}

export async function checkState(name: string, got: string | null): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(name)?.value ?? "";
  jar.delete({ name, path: "/api/apps" });
  const [state, next] = v.split("|");
  if (!state || !got) return null;
  const a = Buffer.from(state), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b) ? next || "/settings/apps" : null;
}
