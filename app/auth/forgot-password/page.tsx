import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
