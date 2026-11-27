import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/sa/frame";
import { humanCheckOn } from "@/lib/safety/server";
import { SignUpForm } from "@/components/sa/signup-form";
import { loadProof } from "@/lib/auth/proof";
import { getViewer } from "@/lib/hub";

export const metadata = { title: "Join SME Hub free", description: "Join SME Hub, the community for Canadian small-business owners.", robots: { index: false, follow: false } };

export default async function Page() {
  // already signed in: nothing to do here
  if ((await getViewer()).userId) redirect("/feed");
  const proof = await loadProof();
  return (
    <AuthFrame enter right={<><span>Already a member?</span> <Link href="/auth/login">Log in</Link></>}>
      <SignUpForm proof={proof} human={await humanCheckOn()} />
    </AuthFrame>
  );
}
