import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { siteOrigin } from "@/lib/auth/site";
import { sendWelcomeOnce } from "@/lib/auth/welcome";

/** For sign-in providers that return a one-time code (PKCE): trade it for a session, then move on. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers, request.url);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    // first sign-in with Google or Microsoft: welcome them too (no-op for everyone else)
    if (!error && data.user) await sendWelcomeOnce(supabase, data.user, origin);
    if (!error) return NextResponse.redirect(`${origin}${safeNext(url.searchParams.get("next"))}`);
  }
  // already used, expired, or opened in another browser: sign in normally
  return NextResponse.redirect(`${origin}/auth/login?notice=link-expired`);
}
