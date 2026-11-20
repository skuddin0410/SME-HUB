import Link from "next/link";
import type { Metadata } from "next";
import { BODY, CARD, PRIMARY_SM, SECONDARY_SM, TITLE } from "@/components/auth-ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Link problem", robots: { index: false, follow: false } };

const COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This link has expired or was already used",
    body: "Email links work once and only for a limited time. If you already confirmed, just sign in.",
  },
  invalid: { title: "This link is not complete", body: "Open the link straight from the email, or ask for a new one." },
  failed: { title: "We could not check this link", body: "Please try again in a minute. If it keeps happening, ask for a new link." },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ reason?: string; type?: string }> }) {
  const { reason = "failed", type } = await searchParams;
  const copy = COPY[reason] ?? COPY.failed;
  const recovery = type === "recovery";
  return (
    <AuthShell>
      <div className={`${CARD} space-y-4`}>
        <div className="space-y-1.5">
          <h1 className={TITLE}>{copy.title}</h1>
          <p className={BODY}>{copy.body}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {!recovery && (
            <Link href="/auth/forgot-password" className={SECONDARY_SM}>
              Forgot password
            </Link>
          )}
          <Link href={recovery ? "/auth/forgot-password" : "/auth/login"} className={PRIMARY_SM}>
            {recovery ? "Send a new reset link" : "Sign in"}
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
