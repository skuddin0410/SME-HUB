import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/sa/frame";
import { ForgotForm } from "@/components/sa/forgot-form";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthFrame right={<Link href="/auth/login">Back to log in</Link>}>
      <ForgotForm />
    </AuthFrame>
  );
}
