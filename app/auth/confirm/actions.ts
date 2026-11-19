"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { siteOrigin } from "@/lib/auth/site";
import { sendEmail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";

const TYPES: EmailOtpType[] = ["email", "signup", "recovery", "magiclink", "invite", "email_change"];

/**
 * Runs when the confirm page submits itself (or the person presses Continue).
 * A POST here, rather than acting on the email link's GET, means mail scanners that open links
 * to check them (Outlook Safe Links and similar) cannot use up the one-time token first.
 */
export async function verifyEmailLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = safeNext(String(formData.get("next") ?? ""), "/feed");

  if (!tokenHash || !TYPES.includes(type)) redirect("/auth/error?reason=invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) {
    const expired = /expired|invalid/i.test(error?.message ?? "");
    redirect(`/auth/error?reason=${expired ? "expired" : "failed"}&type=${type}`);
  }

  // first confirmation of a new account: send the welcome email, exactly once
  if (type === "email" || type === "signup") {
    try {
      const { data: claimed } = await supabase.rpc("claim_welcome_email");
      if (claimed === true && data.user.email) {
        const h = await headers();
        const site = siteOrigin(h, `https://${h.get("host") ?? "localhost"}`);
        await sendEmail({
          from: "info",
          to: data.user.email,
          idempotencyKey: `welcome-${data.user.id}`,
          ...templates.welcome(data.user.user_metadata?.full_name as string | undefined, site),
        });
      }
    } catch (e) {
      // never block someone from signing in because the welcome email failed
      console.error("welcome email:", (e as Error).message);
    }
  }

  redirect(type === "recovery" ? "/auth/update-password" : next);
}
