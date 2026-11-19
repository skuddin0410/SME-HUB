import { SITE_URL } from "@/lib/seo";

/**
 * The public address of the site, for links in emails and redirects.
 * NEXT_PUBLIC_SITE_URL wins (set it once the real domain is live). Before that, the address the
 * visitor used, read from the proxy headers, because behind Amplify request.url can be an internal host.
 */
export function siteOrigin(headers: Headers, requestUrl: string) {
  if (SITE_URL) return SITE_URL;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return new URL(requestUrl).origin;
  const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
