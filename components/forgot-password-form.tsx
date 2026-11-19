"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_ALERT, AUTH_CTA, AUTH_ICON, AUTH_INPUT, AUTH_LINK, NAVY } from "@/components/auth-ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Always answers "check your inbox" when the request went through, whether or not the address
 * has an account, so the form cannot be used to find out who is a member.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL.test(email.trim())) return setError("Enter the email address you joined with.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setBusy(false);
    if (error && (error.status === 429 || /rate|seconds/i.test(error.message))) {
      return setError("Too many requests. Wait a minute, then try again.");
    }
    if (error && error.status && error.status >= 500) return setError("Something went wrong on our side. Try again in a minute.");
    setSent(true);
  };

  if (sent) {
    return (
      <div>
        <MailCheck className="h-9 w-9 text-emerald-700" aria-hidden="true" />
        <h1 className={`mt-3 text-[28px] font-semibold leading-tight ${NAVY}`}>Check your inbox</h1>
        <p className="mt-3 text-[15px] leading-6 text-slate-600">
          If <span className="font-semibold text-slate-800">{email.trim()}</span> has an SMB Hub account, a reset link is on its way from
          accounts@smbhub.ca. It works once and expires in one hour. Check your spam folder if it does not arrive in a few minutes.
        </p>
        <Link href="/auth/login" className={`mt-6 inline-block text-[15px] ${AUTH_LINK}`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className={`text-[28px] font-semibold leading-tight ${NAVY}`}>Forgot your password?</h1>
      <p className="mt-2 text-[15px] leading-6 text-slate-600">Enter your email and we will send you a link to choose a new one.</p>
      <label className="relative mt-6 block">
        <Mail className={AUTH_ICON} />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          autoComplete="email"
          autoFocus
          className={AUTH_INPUT}
        />
      </label>
      {error && (
        <p role="alert" className={`mt-3 ${AUTH_ALERT}`}>
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={`mt-4 ${AUTH_CTA}`}>
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        Send reset link
      </button>
      <p className="mt-5 text-center text-[15px] text-slate-600">
        Remembered it?{" "}
        <Link href="/auth/login" className={AUTH_LINK}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
