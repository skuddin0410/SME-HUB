import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/sa/frame";
import { LoginForm } from "@/components/sa/login-form";
import { safeNext } from "@/lib/auth/safe-next";
import { getViewer } from "@/lib/hub";

export const metadata = { title: "Log in to SME Hub", description: "Log in to SME Hub, the community for Canadian small-business owners.", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) {
  const { notice, next } = await searchParams;
  const to = safeNext(next, "/feed");
  // already signed in: nothing to do here
  if ((await getViewer()).userId) redirect(to);
  return (
    <AuthFrame map enter right={<><span>New to SME Hub?</span> <Link href="/auth/sign-up">Join free</Link></>}>
      <LoginForm next={to} notice={notice} />
    </AuthFrame>
  );
}
