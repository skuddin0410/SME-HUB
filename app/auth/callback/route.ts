import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { siteOrigin } from "@/lib/auth/site";
import { sendWelcomeOnce } from "@/lib/auth/welcome";
import { fillFromProvider, needsFinish } from "@/lib/auth/oauth-profile";

/** For sign-in providers that return a one-time code (PKCE): trade it for a session, then move on. */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request.headers, request.url);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Google or LinkedIn: their real name and profile picture (no-op for everyone else)
      await fillFromProvider(supabase, data.user);
      // first sign-in with Google or LinkedIn: welcome them too (no-op for everyone else)
      await sendWelcomeOnce(supabase, data.user, origin);
    }
    const next = safeNext(url.searchParams.get("next"));
    // Google and LinkedIn skip the sign-up form, so they give its details once before going on
    if (!error && data.user && needsFinish(data.user)) return NextResponse.redirect(`${origin}/auth/finish?next=${encodeURIComponent(next)}`);
    // a short welcome (the map, their name and photo) before the page they asked for
    if (!error) return NextResponse.redirect(`${origin}/auth/welcome?next=${encodeURIComponent(next)}`);
  }
  // already used, expired, or opened in another browser: sign in normally
  return NextResponse.redirect(`${origin}/auth/login?notice=link-expired`);
}
