import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) redirect("/feed");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-bold sm:text-5xl">SME Hub</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Connect, learn and grow with Canadian small business owners.
      </p>
      {!hasEnvVars && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Supabase keys are missing. Copy .env.example to .env.local and fill them in.
        </p>
      )}
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/auth/sign-up">Join free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
