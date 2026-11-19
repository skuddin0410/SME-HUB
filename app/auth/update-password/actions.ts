"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { passwordProblem } from "@/lib/auth/safe-next";
import { siteOrigin } from "@/lib/auth/site";
import { sendEmail } from "@/lib/email/send";
import { templates } from "@/lib/email/templates";

export type PasswordState = { error: string | null };

/**
 * Sets the new password on the server, then signs the account out everywhere else and emails
 * a "your password was changed" notice, so a stolen session or an unexpected change is caught.
 */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Ask for a new one from the Forgot password page." };

  const problem = passwordProblem(password, user.email);
  if (problem) return { error: problem };
  if (password !== confirm) return { error: "The two passwords do not match." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) return { error: "Choose a password you have not used for this account." };
    if (/weak|pwned|leaked/i.test(error.message)) return { error: "That password has appeared in a data breach. Choose another one." };
    return { error: "We could not save your password. Try again in a minute." };
  }

  await supabase.auth.signOut({ scope: "others" });

  if (user.email) {
    try {
      const h = await headers();
      await sendEmail({
        from: "accounts",
        to: user.email,
        ...templates.passwordChanged(user.user_metadata?.full_name as string | undefined, siteOrigin(h, `https://${h.get("host") ?? "localhost"}`), new Date()),
      });
    } catch (e) {
      console.error("password changed email:", (e as Error).message);
    }
  }

  redirect("/feed?notice=password-updated");
}
