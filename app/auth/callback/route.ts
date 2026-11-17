import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Where the confirmation email lands: trade the one-time code for a session, then go to the hub. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/profile/edit`);
  }
  // already confirmed, expired, or opened in another browser: sign in normally
  return NextResponse.redirect(`${origin}/auth/login`);
}
