"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { verifyEmailLink } from "./actions";

function Continue() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0a66c2] px-6 text-[15px] font-semibold text-white hover:bg-[#004182] disabled:opacity-70"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      Continue
    </button>
  );
}

/** Submits itself once on load, so one click on the email link is enough. With scripts off, press Continue. */
export function ConfirmForm({ tokenHash, type, next }: { tokenHash: string; type: string; next: string }) {
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef(false);
  useEffect(() => {
    if (!sent.current && tokenHash) {
      sent.current = true;
      form.current?.requestSubmit();
    }
  }, [tokenHash]);

  const heading = type === "recovery" ? "Opening password reset" : "Confirming your email";
  return (
    <section className="mx-auto flex w-full max-w-[465px] flex-1 flex-col justify-center px-5 py-12 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0a66c2]" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold text-[#0b1437]">{heading}</h1>
      <p className="mt-2 text-[15px] text-slate-600">This takes a second. You will be signed in automatically.</p>
      <form ref={form} action={verifyEmailLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <Continue />
      </form>
    </section>
  );
}
