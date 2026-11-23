import Link from "next/link";
import { AuthFrame } from "@/components/sa/frame";
import { VerifyForm } from "@/components/sa/verify-form";

export const metadata = { title: "Confirm your email", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <AuthFrame right={<Link href="/auth/login">Log in</Link>}>
      <VerifyForm email={email.slice(0, 254)} />
    </AuthFrame>
  );
}
