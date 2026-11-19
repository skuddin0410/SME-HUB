import Link from "next/link";
import type { Metadata } from "next";

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
    <section className="mx-auto flex w-full max-w-[465px] flex-1 flex-col justify-center px-5 py-12">
      <h1 className="text-[28px] font-semibold leading-tight text-[#0b1437]">{copy.title}</h1>
      <p className="mt-3 text-[15px] leading-6 text-slate-600">{copy.body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={recovery ? "/auth/forgot-password" : "/auth/login"}
          className="inline-flex h-11 items-center rounded-md bg-[#0a66c2] px-5 text-[15px] font-semibold text-white hover:bg-[#004182]"
        >
          {recovery ? "Send a new reset link" : "Sign in"}
        </Link>
        {!recovery && (
          <Link href="/auth/forgot-password" className="inline-flex h-11 items-center rounded-md border border-[#0a66c2] px-5 text-[15px] font-semibold text-[#0a66c2] hover:bg-[#edf3f8]">
            Forgot password
          </Link>
        )}
      </div>
    </section>
  );
}
