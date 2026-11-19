import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

/** The address the visitor actually used. Behind a hosting proxy, request.url can name an internal host. */
function siteOrigin(request: NextRequest) {
  if (SITE_URL) return SITE_URL;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Where the confirmation email lands: trade the one-time code for a session, then open the feed. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/feed`);
  }
  // already confirmed, expired, or opened in another browser: sign in normally
  return NextResponse.redirect(`${origin}/auth/login`);
}
