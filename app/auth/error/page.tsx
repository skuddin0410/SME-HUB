import Link from "next/link";
import type { Metadata } from "next";
import { AuthFrame } from "@/components/sa/frame";
import { Expired } from "@/components/sa/reset-form";
import { ClockIcon } from "@/components/sa/fields";

export const metadata: Metadata = { title: "Link problem", robots: { index: false, follow: false } };

const COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This link has expired",
    body: "Email links work once and only for a limited time. If you already confirmed, just log in.",
  },
  invalid: { title: "This link is not complete", body: "Open the link straight from the email, or ask for a new one." },
  failed: { title: "We could not check this link", body: "Please try again in a minute. If it keeps happening, ask for a new link." },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ reason?: string; type?: string }> }) {
  const { reason = "failed", type } = await searchParams;
  const copy = COPY[reason] ?? COPY.failed;
  const recovery = type === "recovery";
  return (
    <AuthFrame right={<Link href="/auth/login">Back to log in</Link>}>
      {recovery && reason !== "invalid" ? (
        <Expired />
      ) : (
        <section className="card">
          <div className="center">
            <div className="icon w"><ClockIcon /></div>
            <h1>{copy.title}</h1>
            <p className="sub">{copy.body}</p>
            <Link className="btn p" href="/auth/login">Log in</Link>
            <p className="foot"><Link href="/auth/forgot-password">Forgot password?</Link></p>
          </div>
        </section>
      )}
    </AuthFrame>
  );
}
