import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/sa/frame";
import { ResetForm } from "@/components/sa/reset-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Page() {
  // only reachable with the session the reset link created (or while signed in)
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) redirect("/auth/error?reason=expired&type=recovery");
  return (
    <AuthFrame right={<Link href="/auth/login">Back to log in</Link>}>
      <ResetForm email={data.user.email ?? ""} />
    </AuthFrame>
  );
}
