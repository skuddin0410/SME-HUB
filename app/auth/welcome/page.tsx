import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/sa/frame";
import { WelcomeGo } from "@/components/sa/welcome";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { whoIs } from "@/lib/auth/who";

export const metadata = { title: "Welcome to SME Hub", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** After Google or LinkedIn (and after finishing a Google or LinkedIn sign-up): the same welcome moment as the log-in form. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; joined?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next ?? null, "/feed");
  const who = await whoIs(await createClient());
  if (!who) redirect("/auth/login");
  return (
    <AuthFrame map>
      <WelcomeGo who={who} next={next} joined={sp.joined === "1"} />
    </AuthFrame>
  );
}
