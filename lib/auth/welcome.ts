import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";

/**
 * Sends the welcome email from info@ the first time an account is confirmed or first signs in
 * with Google or Microsoft. The database claim makes it exactly once, however often this runs.
 * Never throws: a failed welcome must not stop someone signing in.
 */
export async function sendWelcomeOnce(supabase: SupabaseClient, user: User, siteUrl: string) {
  try {
    if (!user.email) return;
    const { data: claimed } = await supabase.rpc("claim_welcome_email");
    if (claimed !== true) return;
    const meta = user.user_metadata ?? {};
    const name = (meta.full_name ?? meta.name ?? "") as string;
    await sendEmail({ from: "info", to: user.email, idempotencyKey: `welcome-${user.id}`, ...templates.welcome(name, siteUrl) });
  } catch (e) {
    console.error("welcome email:", (e as Error).message);
  }
}
