"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Building2, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/auth/safe-next";
import { AUTH_MODE_EVENT, MAPLE_STAR } from "@/components/auth-chrome";
import { AuthShowcase } from "@/components/auth-showcase";
import { ForgotPasswordDialog } from "@/components/forgot-password-form";
import { useToast } from "@/components/auth-toast";
import { FIELD_ERROR, FORM_ERROR, ICON, INPUT, INPUT_PLAIN, LABEL, LINK, PRIMARY } from "@/components/auth-ui";

type Mode = "signin" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVINCES = [
  ["ON", "Ontario (ON)"],
  ["BC", "British Columbia (BC)"],
  ["QC", "Québec (QC)"],
  ["AB", "Alberta (AB)"],
  ["NS", "Nova Scotia (NS)"],
  ["MB", "Manitoba (MB)"],
  ["SK", "Saskatchewan (SK)"],
  ["NB", "New Brunswick (NB)"],
  ["NL", "Newfoundland and Labrador (NL)"],
  ["PE", "Prince Edward Island (PE)"],
  ["YT", "Yukon (YT)"],
  ["NT", "Northwest Territories (NT)"],
  ["NU", "Nunavut (NU)"],
] as const;

const STRENGTH_COLORS = ["bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
const STRENGTH_LABELS = ["Weak password", "Fair — add numbers or symbols", "Good business password", "Strong security"];
function strengthScore(v: string) {
  let s = 0;
  if (v.length >= 8) s++;
  if (v.length >= 12) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

const TAB_ON = "relative z-10 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white transition-colors";
const TAB_OFF = "relative z-10 py-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors";
const SSO =
  "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all active:scale-[0.99] disabled:opacity-60";

export function AuthLanding({ initialMode, notice }: { initialMode: "signin" | "join"; notice?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setModeState] = useState<Mode>(initialMode === "join" ? "signup" : "signin");
  const signup = mode === "signup";

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [province, setProvince] = useState("ON");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sso, setSso] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const setMode = useCallback((m: Mode, focus = false) => {
    setModeState(m);
    setErrors({});
    setSentTo(null);
    window.history.replaceState(null, "", m === "signup" ? "/auth/sign-up" : "/auth/login");
    if (focus) setTimeout(() => emailRef.current?.focus(), 0);
  }, []);

  // the header's Sign in / Join now buttons
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent<Mode>).detail, true);
    window.addEventListener(AUTH_MODE_EVENT, on);
    return () => window.removeEventListener(AUTH_MODE_EVENT, on);
  }, [setMode]);

  useEffect(() => {
    if (notice === "link-expired") toast("That link has expired or was already used. Sign in, or reset your password.");
  }, [notice, toast]);

  const score = strengthScore(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = "Please enter a valid business or personal email address.";
    if (signup) {
      if (name.trim().length < 2) next.name = "Please enter your full name.";
      const problem = passwordProblem(password, email);
      if (problem) next.password = problem;
    } else if (!password) next.password = "Please enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const supabase = createClient();
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim(), business_name: business.trim() || null, province },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/feed`,
        },
      });
      setBusy(false);
      if (error) {
        setErrors({ form: /rate|seconds/i.test(error.message) ? "Too many attempts. Wait a minute, then try again." : error.message });
      } else if (data.user && data.user.identities?.length === 0) {
        setErrors({ form: "That email already has an account. Sign in instead, or reset your password." });
      } else if (data.session) {
        router.push("/feed");
        router.refresh();
      } else {
        setSentTo(email.trim());
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setBusy(false);
        setErrors({
          form:
            error.message === "Email not confirmed"
              ? "Confirm your email first. Check your inbox for the message from accounts@smbhub.ca."
              : /rate|seconds/i.test(error.message)
                ? "Too many attempts. Wait a minute, then try again."
                : "That email and password do not match.",
        });
      } else {
        router.push("/feed");
        router.refresh();
      }
    }
  };

  /** Google or Microsoft. Checks first that the provider is switched on in Supabase. */
  const startSso = async (provider: "google" | "azure", label: string) => {
    setSso(provider);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      });
      const settings = (await res.json()) as { external?: Record<string, boolean> };
      if (!settings.external?.[provider]) {
        toast(`${label} sign-in is coming soon. Please use your email for now.`);
        return setSso(null);
      }
    } catch {
      toast("We could not reach the sign-in service. Try again in a moment.");
      return setSso(null);
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/feed`, scopes: provider === "azure" ? "email" : undefined },
    });
    if (error) {
      toast(`Could not start ${label} sign-in. Please use your email.`);
      setSso(null);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      {/* left: headline and the sign-in / join card */}
      <div className="lg:col-span-5 space-y-6 auth-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-subtle">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={MAPLE_STAR} />
            </svg>
          </span>
          <span className="text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
            <span className="text-slate-400 dark:text-slate-500 font-bold mr-1">CA</span> Canada&apos;s Professional Network
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="font-jakarta font-extrabold text-3xl sm:text-4xl lg:text-[42px] leading-[1.12] tracking-tight text-slate-900 dark:text-white">
            Welcome to your small business community
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Connect, learn, and grow with entrepreneurs, professionals, and business leaders across Canada.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0E1526] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-elevated p-5 sm:p-6 space-y-5">
          {sentTo ? (
            <div className="text-center space-y-3 py-2 auth-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/70 dark:border-emerald-800/60">
                <MailCheck className="w-7 h-7" />
              </div>
              <h2 className="font-jakarta font-bold text-xl text-slate-900 dark:text-white">Check your inbox</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We sent a confirmation link to <span className="font-semibold text-slate-900 dark:text-white">{sentTo}</span> from accounts@smbhub.ca. One click
                confirms your email and signs you in.
              </p>
              <ResendLink email={sentTo} />
              <button type="button" onClick={() => setMode("signin")} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label="Authentication Mode" className="relative grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <div
                  className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 transition-transform duration-200 ease-out"
                  style={{ transform: signup ? "translateX(100%)" : "translateX(0%)" }}
                />
                <button type="button" role="tab" aria-selected={!signup} onClick={() => setMode("signin")} className={signup ? TAB_OFF : TAB_ON}>
                  Sign in
                </button>
                <button type="button" role="tab" aria-selected={signup} onClick={() => setMode("signup")} className={signup ? TAB_ON : TAB_OFF}>
                  Join now
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" disabled={sso !== null} onClick={() => startSso("google", "Google")} className={SSO}>
                  {sso === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
                  <span>Google</span>
                </button>
                <button type="button" disabled={sso !== null} onClick={() => startSso("azure", "Microsoft 365")} className={SSO}>
                  {sso === "azure" ? <Loader2 className="w-4 h-4 animate-spin" /> : <MicrosoftMark />}
                  <span>Microsoft 365</span>
                </button>
              </div>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800" />
                <span className="shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">or continue with email</span>
                <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800" />
              </div>

              <form onSubmit={submit} className="space-y-3.5" noValidate>
                {signup && (
                  <div className="space-y-3.5 auth-fade-in">
                    <div>
                      <label htmlFor="full-name" className={LABEL}>
                        Full name
                      </label>
                      <div className="relative">
                        <User className={ICON} />
                        <input id="full-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Claire Tremblay" autoComplete="name" maxLength={80} className={INPUT} />
                      </div>
                      {errors.name && <p className={FIELD_ERROR}>{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="business-name" className={LABEL}>
                          Business / Venture
                        </label>
                        <div className="relative">
                          <Building2 className={ICON} />
                          <input
                            id="business-name"
                            type="text"
                            value={business}
                            onChange={(e) => setBusiness(e.target.value)}
                            placeholder="NorthStar Roasters"
                            autoComplete="organization"
                            maxLength={120}
                            className={INPUT.replace("pr-3.5", "pr-3")}
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="province-select" className={LABEL}>
                          Province / Territory
                        </label>
                        <select id="province-select" value={province} onChange={(e) => setProvince(e.target.value)} className={INPUT_PLAIN}>
                          {PROVINCES.map(([code, label]) => (
                            <option key={code} value={code}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="email-input" className={LABEL}>
                    Work or business email
                  </label>
                  <div className="relative">
                    <Mail className={ICON} />
                    <input
                      ref={emailRef}
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.ca"
                      autoComplete="email"
                      className={INPUT}
                    />
                  </div>
                  {errors.email && <p className={FIELD_ERROR}>{errors.email}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    {!signup && (
                      <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={ICON} />
                    <input
                      id="password-input"
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete={signup ? "new-password" : "current-password"}
                      maxLength={72}
                      className={INPUT.replace("pr-3.5", "pr-10")}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {signup && (
                    <div className="mt-2 space-y-1">
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full transition-colors ${i <= score && password ? STRENGTH_COLORS[Math.max(0, score - 1)] : "bg-slate-200 dark:bg-slate-800"}`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400">{password ? STRENGTH_LABELS[Math.max(0, score - 1)] : "Use 8+ characters with a number & symbol"}</p>
                    </div>
                  )}
                  {errors.password && <p className={FIELD_ERROR}>{errors.password}</p>}
                </div>

                {errors.form && (
                  <p role="alert" className={FORM_ERROR}>
                    {errors.form}
                  </p>
                )}

                <button type="submit" disabled={busy} className={PRIMARY}>
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{busy ? (signup ? "Creating your account..." : "Signing in...") : signup ? "Create your SMB Hub account" : "Sign in"}</span>
                  {!busy && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
                </button>
              </form>

              <div className="pt-1 space-y-3 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  By continuing, you agree to the SMB Hub{" "}
                  <Link href="/policies/terms" className={LINK}>
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/policies/community-guidelines" className={LINK}>
                    Community Guidelines
                  </Link>
                  .
                </p>
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                  <span>{signup ? "Already have an SMB Hub account?" : "New to SMB Hub?"}</span>{" "}
                  <button type="button" onClick={() => setMode(signup ? "signin" : "signup")} className="ml-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {signup ? "Sign in" : "Join now"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* right: skyline and city cards */}
      <div className="lg:col-span-7">
        <AuthShowcase />
      </div>

      <ForgotPasswordDialog open={forgotOpen} initialEmail={email} onClose={() => setForgotOpen(false)} />
    </div>
  );
}

/** Sends the confirmation email again. Supabase allows it about once a minute. */
function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "wait">("idle");
  const resend = async () => {
    setState("busy");
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/feed` },
    });
    setState(error ? "wait" : "sent");
  };
  if (state === "sent") return <p className="text-xs text-slate-500 dark:text-slate-400">Sent again. It can take a minute to arrive.</p>;
  if (state === "wait") return <p className="text-xs text-slate-500 dark:text-slate-400">Please wait a minute before asking again.</p>;
  return (
    <p className="text-xs text-slate-600 dark:text-slate-400">
      No email?{" "}
      <button type="button" disabled={state === "busy"} onClick={resend} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
        Send it again
      </button>
    </p>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
