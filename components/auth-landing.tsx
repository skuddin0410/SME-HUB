"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { passwordProblem } from "@/lib/auth/safe-next";
import { AUTH_MODE_EVENT } from "@/components/auth-chrome";
import { AuthShowcase } from "@/components/auth-showcase";
import { ForgotPasswordDialog } from "@/components/forgot-password-form";
import { useToast } from "@/components/auth-toast";
import { FIELD_ERROR, FORM_ERROR, ICON, INPUT, INPUT_PLAIN, LABEL, LINK, PRIMARY } from "@/components/auth-ui";

type Mode = "signin" | "signup";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVINCES = [
  ["ON", "Ontario"],
  ["BC", "British Columbia"],
  ["QC", "Québec"],
  ["AB", "Alberta"],
  ["NS", "Nova Scotia"],
  ["MB", "Manitoba"],
  ["SK", "Saskatchewan"],
  ["NB", "New Brunswick"],
  ["NL", "Newfoundland and Labrador"],
  ["PE", "Prince Edward Island"],
  ["YT", "Yukon"],
  ["NT", "Northwest Territories (NT)"],
  ["NU", "Nunavut (NU)"],
] as const;

// design: 4 bars, level by length
const STRENGTH = [
  { label: "Enter password", bar: "bg-slate-200", text: "text-slate-400" },
  { label: "Weak", bar: "bg-rose-500", text: "text-rose-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-blue-500", text: "text-blue-600" },
  { label: "Strong • 12+ chars", bar: "bg-emerald-500", text: "text-emerald-600" },
];
function strengthLevel(v: string) {
  const n = v.length;
  return n === 0 ? 0 : n < 6 ? 1 : n < 9 ? 2 : n < 12 ? 3 : 4;
}

const TAB_ON = "relative z-10 py-2 rounded-full text-[0.875rem] font-semibold text-slate-950 transition-colors";
const TAB_OFF = "relative z-10 py-2 rounded-full text-[0.875rem] font-medium text-slate-600 hover:text-slate-900 transition-colors";
const SECONDARY =
  "w-full h-11 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-[0.875rem] font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-60";
const SSO =
  "h-10 px-3 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-60";

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
  const [magic, setMagic] = useState<"idle" | "busy">("idle");
  const emailRef = useRef<HTMLInputElement>(null);

  const setMode = useCallback((m: Mode, focus = false) => {
    setModeState(m);
    setErrors({});
    setSentTo(null);
    window.history.replaceState(null, "", m === "signup" ? "/auth/sign-up" : "/auth/login");
    if (focus) setTimeout(() => emailRef.current?.focus(), 0);
  }, []);

  // the header's Sign in / Join now buttons, and the showcase's Join button
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent<Mode>).detail, true);
    window.addEventListener(AUTH_MODE_EVENT, on);
    return () => window.removeEventListener(AUTH_MODE_EVENT, on);
  }, [setMode]);

  useEffect(() => {
    if (notice === "link-expired") toast("That link has expired or was already used. Sign in, or reset your password.");
  }, [notice, toast]);

  const level = strengthLevel(password);

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

  /** One-time sign-in link for an existing account (never creates one). Sent by accounts@smbhub.ca. */
  const sendMagicLink = async () => {
    if (magic === "busy") return;
    if (!EMAIL.test(email.trim())) {
      setErrors({ email: "Enter your email above and we will send you a sign-in link." });
      emailRef.current?.focus();
      return;
    }
    setErrors({});
    setMagic("busy");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=/feed` },
    });
    setMagic("idle");
    if (error && /rate|seconds/i.test(error.message)) {
      setErrors({ form: "Too many attempts. Wait a minute, then try again." });
      return;
    }
    // same message whether or not the account exists, so the form cannot be used to probe for members
    toast(`If ${email.trim()} has an SMB Hub account, a sign-in link is on its way from accounts@smbhub.ca.`);
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

  /** The email form for one mode. The ghost copy is invisible and only holds the Join form's height. */
  const renderForm = (isJoin: boolean, ghost: boolean) => (
    <form onSubmit={submit} className="space-y-3.5" noValidate>
      {isJoin && (
        <div className="grid grid-cols-2 gap-2.5 auth-fade-in">
          <div className="min-w-0">
            <label htmlFor="auth-fullname" className={LABEL}>
              Full name
            </label>
            <input
              id="auth-fullname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Abdur Rahman Uddin"
              autoComplete="name"
              maxLength={80}
              className={INPUT_PLAIN}
            />
            {errors.name && <p className={FIELD_ERROR}>{errors.name}</p>}
          </div>
          <div className="min-w-0">
            <label htmlFor="auth-company" className={LABEL}>
              Business / Company
            </label>
            <input
              id="auth-company"
              type="text"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="NorthPeak Solutions Inc."
              autoComplete="organization"
              maxLength={120}
              className={INPUT_PLAIN}
            />
          </div>
        </div>
      )}

      <div className={isJoin ? "grid grid-cols-12 gap-2.5" : ""}>
        <div className={isJoin ? "col-span-8 min-w-0" : ""}>
          <label htmlFor="auth-email" className={LABEL}>
            Work or business email
          </label>
          <div className="relative">
            <Mail className={ICON} />
            <input
              ref={ghost ? undefined : emailRef}
              id="auth-email"
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
        {isJoin && (
          <div className="col-span-4 min-w-0">
            <label htmlFor="auth-province" className={LABEL}>
              Province
            </label>
            <select
              id="auth-province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full h-11 px-3 rounded-full bg-slate-50/90 border border-slate-200 text-[0.875rem] font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
            >
              {PROVINCES.map(([code, label]) => (
                <option key={code} value={code} title={label}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          {!isJoin && (
            <button type="button" onClick={() => setForgotOpen(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Forgot password?
            </button>
          )}
        </div>
        <div className="relative">
          <Lock className={ICON} />
          <input
            id="auth-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isJoin ? "Create a password" : "Enter password"}
            autoComplete={isJoin ? "new-password" : "current-password"}
            maxLength={72}
            className={INPUT.replace("pr-4", "pr-10")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label="Toggle password visibility"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {isJoin && (
          <div className="mt-2 space-y-1 auth-fade-in">
            <div className="flex items-center justify-between text-[0.75rem]">
              <span className="text-slate-500">Password strength</span>
              <span className={`font-semibold ${STRENGTH[level].text}`}>{STRENGTH[level].label}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`rounded-full transition-colors ${i <= level ? STRENGTH[level].bar : "bg-slate-200"}`} />
              ))}
            </div>
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
        <span>{busy ? (isJoin ? "Creating your account..." : "Signing in...") : isJoin ? "Create free account" : "Sign in"}</span>
        {!busy && <ArrowRight className="w-4 h-4" />}
      </button>

      {!isJoin && (
        <>
          <button type="button" disabled={magic === "busy"} onClick={sendMagicLink} className={SECONDARY}>
            {magic === "busy" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-slate-500" />}
            <span>Email me a one-time sign-in link</span>
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[0.75rem] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Encrypted sign-in • Your data is stored in Canada
          </p>
        </>
      )}
    </form>
  );

  /** Tabs, sign-in buttons, the form and the card footer for one mode. */
  const renderCard = (isJoin: boolean, ghost: boolean) => (
    <>
      <div className="flex-1 space-y-4">
        <div role="tablist" aria-label="Sign in or join" className="relative grid grid-cols-2 p-1 rounded-full bg-slate-100/90 border border-slate-200/70">
          <div
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-200 ease-out"
            style={{ transform: isJoin ? "translateX(100%)" : "translateX(0%)" }}
          />
          <button type="button" role="tab" aria-selected={!isJoin} onClick={() => setMode("signin")} className={isJoin ? TAB_OFF : TAB_ON}>
            Sign in
          </button>
          <button type="button" role="tab" aria-selected={isJoin} onClick={() => setMode("signup")} className={isJoin ? TAB_ON : TAB_OFF}>
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
            <span className="truncate">Microsoft 365</span>
          </button>
        </div>

        <div className="relative flex items-center py-0.5">
          <div className="flex-grow border-t border-slate-200/80" />
          <span className="shrink mx-3 text-[0.6562rem] font-bold uppercase tracking-wider text-slate-400">Or continue with email</span>
          <div className="flex-grow border-t border-slate-200/80" />
        </div>

        {renderForm(isJoin, ghost)}
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 text-center space-y-2">
        <p className="text-[0.75rem] text-slate-500 leading-relaxed">
          By continuing, you agree to the SMB Hub{" "}
          <Link href="/policies/terms" className="underline hover:text-slate-800">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/policies/community-guidelines" className="underline hover:text-slate-800">
            Community Guidelines
          </Link>
          .
        </p>
        <p className="text-xs text-slate-600">
          {isJoin ? "Already have an account? " : "New to SMB Hub? "}
          <button type="button" onClick={() => setMode(isJoin ? "signin" : "signup")} className={LINK}>
            {isJoin ? "Sign in" : "Join now"}
          </button>
        </p>
      </div>
    </>
  );

  const renderInbox = (to: string) => (
    <div className="my-auto text-center space-y-3 py-6 auth-fade-in">
      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200/70">
        <MailCheck className="w-7 h-7" />
      </div>
      <h2 className="font-jakarta font-bold text-xl text-slate-950">Check your inbox</h2>
      <p className="text-sm text-slate-600">
        We sent a confirmation link to <span className="font-semibold text-slate-900">{to}</span> from accounts@smbhub.ca. One click confirms your email and
        signs you in.
      </p>
      <ResendLink email={to} />
      <button type="button" onClick={() => setMode("signin")} className="text-xs font-semibold text-blue-600 hover:underline">
        Back to sign in
      </button>
    </div>
  );

  return (
    <main className="flex-1 max-w-[80rem] w-full mx-auto px-6 lg:px-8 py-8 lg:py-9 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch content-center">
      {/* left: badge, heading and the sign-in / join card */}
      <div className="flex flex-col w-full">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5E5E8] mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-xs font-bold text-slate-800">CA</span>
            <span className="text-xs font-medium text-slate-600">Canada&apos;s Professional Network</span>
          </div>
          <h1 className="font-jakarta font-extrabold text-4xl xl:text-[2.9375rem] leading-[1.08] tracking-tight text-slate-900 whitespace-nowrap">
            Build with Canada.
          </h1>
          <p className="mt-2 mb-5 text-[0.9688rem] leading-relaxed text-slate-600">
            Connect, learn, and grow with entrepreneurs, professionals, and business leaders across Canada.
          </p>
        </div>

        {/* One fixed-size card sized to its content: invisible copies of both layouts sit in the same
            grid cell, so Sign in, Join now and "Check your inbox" all share the taller height and
            switching never resizes the card or the page */}
        <div className="bg-white border border-[#E5E5E8] rounded-3xl p-6 sm:p-7 shadow-auth-card grid">
          <div className="row-start-1 col-start-1 flex flex-col">{sentTo ? renderInbox(sentTo) : renderCard(signup, false)}</div>
          {(sentTo || !signup) && (
            <div className="row-start-1 col-start-1 invisible flex flex-col" aria-hidden="true" inert>
              {renderCard(true, true)}
            </div>
          )}
          {(sentTo || signup) && (
            <div className="row-start-1 col-start-1 invisible flex flex-col" aria-hidden="true" inert>
              {renderCard(false, true)}
            </div>
          )}
        </div>
      </div>

      {/* right: founder stories showcase, same height as the left column */}
      <div className="flex flex-col w-full">
        <AuthShowcase onJoin={() => setMode("signup", true)} />
      </div>

      <ForgotPasswordDialog open={forgotOpen} initialEmail={email} onClose={() => setForgotOpen(false)} />
    </main>
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
  if (state === "sent") return <p className="text-xs text-slate-500">Sent again. It can take a minute to arrive.</p>;
  if (state === "wait") return <p className="text-xs text-slate-500">Please wait a minute before asking again.</p>;
  return (
    <p className="text-xs text-slate-600">
      No email?{" "}
      <button type="button" disabled={state === "busy"} onClick={resend} className="font-semibold text-blue-600 hover:underline">
        Send it again
      </button>
    </p>
  );
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.24 24 12 24Z"
      />
      <path fill="#FBBC05" d="M5.02 14.03c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.17H1.01C.37 7.45 0 8.89 0 10.42s.37 2.97 1.01 4.25l4.01-3.14Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.83l4.01 3.14c.98-2.95 3.73-5.22 6.98-5.22Z"
      />
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
