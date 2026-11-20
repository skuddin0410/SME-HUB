"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { verifyEmailLink } from "./actions";
import { BODY, CARD, PRIMARY_SM, TITLE } from "@/components/auth-ui";
import { AuthShell } from "@/components/auth-shell";

function Continue() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={PRIMARY_SM}>
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
    <AuthShell>
      <div className={`${CARD} text-center space-y-3`}>
        <Loader2 className="mx-auto w-7 h-7 animate-spin text-blue-600" aria-hidden="true" />
        <h1 className={TITLE}>{type === "recovery" ? "Opening password reset" : "Confirming your email"}</h1>
        <p className={BODY}>This takes a second. You will be signed in automatically.</p>
        <form ref={form} action={verifyEmailLink} className="pt-1">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <Continue />
        </form>
      </div>
    </AuthShell>
  );
}
