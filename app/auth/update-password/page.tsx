import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page() {
  // only reachable with the session the reset link created (or while signed in)
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/auth/error?reason=expired&type=recovery");
  return (
    <AuthShell>
      <UpdatePasswordForm />
    </AuthShell>
  );
}
