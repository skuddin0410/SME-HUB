"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { verifyEmailLink } from "./actions";
import { AuthFrame } from "@/components/sa/frame";

function Continue() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn p">
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

  return (
    <AuthFrame>
      <section className="card">
        <div className="center">
          <div className="icon">
            <Loader2 className="animate-spin" size={26} aria-hidden="true" />
          </div>
          <h1>{type === "recovery" ? "Opening password reset" : "Confirming your email"}</h1>
          <p className="sub">This takes a second. You will be logged in automatically.</p>
          <form ref={form} action={verifyEmailLink}>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <Continue />
          </form>
        </div>
      </section>
    </AuthFrame>
  );
}
