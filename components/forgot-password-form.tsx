"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2, Mail, MailCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/auth-toast";
import { BODY, CARD, FIELD_ERROR, ICON, INPUT, LABEL, PRIMARY, PRIMARY_SM, TITLE } from "@/components/auth-ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Asks Supabase for a reset email. Answers the same whether or not the address has an account,
 * so the form cannot be used to find out who is a member. Only real failures are reported.
 */
async function requestReset(email: string): Promise<string | null> {
  const { error } = await createClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/update-password`,
  });
  if (!error) return null;
  if (error.status === 429 || /rate|seconds/i.test(error.message)) return "Too many requests. Wait a minute, then try again.";
  if (error.status && error.status >= 500) return "Something went wrong on our side. Try again in a minute.";
  return null;
}

/** The "Forgot password?" dialog on the sign-in card. */
export function ForgotPasswordDialog({ open, initialEmail, onClose }: { open: boolean; initialEmail: string; onClose: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setError(null);
    setTimeout(() => input.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, initialEmail, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) return setError("Please enter the email you joined with.");
    setBusy(true);
    const problem = await requestReset(email.trim());
    setBusy(false);
    if (problem) return setError(problem);
    onClose();
    toast(`If ${email.trim()} has an account, a reset link is on its way.`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated p-6 auth-fade-in">
        <div className="flex items-center justify-between mb-3">
          <h3 id="reset-title" className={TITLE}>
            Reset your password
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className={`${BODY} mb-4`}>Enter the email associated with your SMB Hub account and we will send a secure password reset link.</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <input
              ref={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.ca"
              aria-label="Email address"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-600 text-slate-900 dark:text-white"
            />
            {error && <p className={FIELD_ERROR}>{error}</p>}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={busy} className={PRIMARY_SM}>
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Send Reset Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** The same request as a full page (/auth/forgot-password), used by links in emails and error pages. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL.test(email.trim())) return setError("Please enter the email you joined with.");
    setBusy(true);
    setError(null);
    const problem = await requestReset(email.trim());
    setBusy(false);
    if (problem) return setError(problem);
    setSent(true);
  };

  if (sent) {
    return (
      <div className={`${CARD} text-center space-y-3`}>
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/70 dark:border-emerald-800/60">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="font-jakarta font-bold text-xl text-slate-900 dark:text-white">Check your inbox</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          If <span className="font-semibold text-slate-900 dark:text-white">{email.trim()}</span> has an SMB Hub account, a reset link is on its way from accounts@smbhub.ca. It
          works once and expires in one hour.
        </p>
        <Link href="/auth/login" className="inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={`${CARD} space-y-4`}>
      <div className="space-y-1.5">
        <h1 className={TITLE}>Reset your password</h1>
        <p className={BODY}>Enter the email associated with your SMB Hub account and we will send a secure password reset link.</p>
      </div>
      <div>
        <label htmlFor="reset-email" className={LABEL}>
          Work or business email
        </label>
        <div className="relative">
          <Mail className={ICON} />
          <input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.ca" autoComplete="email" autoFocus className={INPUT} />
        </div>
        {error && <p className={FIELD_ERROR}>{error}</p>}
      </div>
      <button type="submit" disabled={busy} className={PRIMARY}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Send Reset Link
      </button>
      <p className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-center text-xs text-slate-600 dark:text-slate-400">
        Remembered it?
        <Link href="/auth/login" className="ml-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
