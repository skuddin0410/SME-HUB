"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AUTH_ALERT, AUTH_CTA, AUTH_ICON, AUTH_INPUT, AUTH_LINK, NAVY } from "@/components/auth-ui";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Mode = "signin" | "join";


function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) score++;
  return score;
}
const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"];
const BAR = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-sky-500", "bg-emerald-600"];

/** Sends the confirmation email again, at most once a minute. */
function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "wait">("idle");
  const resend = async () => {
    setState("busy");
    const { error } = await createClient().auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/feed` } });
    setState(error ? "wait" : "sent");
  };
  return (
    <p className="mt-4 text-sm text-slate-600">
      {state === "sent" ? (
        "Sent again. It can take a minute to arrive."
      ) : state === "wait" ? (
        "Please wait a minute before asking again."
      ) : (
        <>
          No email?{" "}
          <button type="button" disabled={state === "busy"} onClick={resend} className={AUTH_LINK}>
            Send it again
          </button>
        </>
      )}
    </p>
  );
}

// ---------- the form ----------
function AuthForm({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const join = mode === "join";
  const score = strength(password);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = emailOk && (join ? name.trim().length > 1 && password.length >= 8 : password.length > 0);

  useEffect(() => setError(null), [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!ready) {
      setError(
        !emailOk
          ? "Enter your email address."
          : join && name.trim().length < 2
            ? "Enter your full name."
            : join
              ? "Choose a password with 8 or more characters."
              : "Enter your password.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    if (join) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/feed` },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
      } else if (data.user && data.user.identities?.length === 0) {
        // Supabase answers a sign-up for an existing address without saying so; this is how it shows
        setError("That email already has an account. Sign in instead.");
        setBusy(false);
      } else if (data.session) {
        router.push("/feed");
        router.refresh();
      } else {
        setSentTo(email);
        setBusy(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Email not confirmed" ? "Confirm your email first. Check your inbox for our message." : "That email and password do not match.");
        setBusy(false);
      } else {
        router.push("/feed");
        router.refresh();
      }
    }
  };

  if (sentTo) {
    return (
      <div className="animate-rise rounded-lg border border-[#e0dfdc] bg-white p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className={cx("mt-4 text-2xl font-semibold", NAVY)}>Check your inbox</h2>
        <p className="mt-2 text-sm text-slate-500">
          We sent a confirmation link to <span className="font-semibold text-slate-800">{sentTo}</span>. It comes from accounts@smbhub.ca. Open it to finish joining; the link signs you in. Check spam if it does not arrive in a few minutes.
        </p>
        <ResendLink email={sentTo} />
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setMode("signin");
          }}
          className="press mt-5 rounded-md border border-[#0a66c2] px-5 py-2 text-sm font-semibold text-[#0a66c2] hover:bg-[#edf3f8]"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const wrap = "relative block";
  const icon = AUTH_ICON;
  const input = AUTH_INPUT;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      {/* instant switch between the two forms */}
      <div className="relative grid h-11 grid-cols-2 rounded-md bg-[#e3e9f4] p-[3px] text-[15px]" role="tablist">
        <span
          className={cx(
            "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-[5px] bg-white shadow-[0_1px_4px_rgb(15_23_42/0.18)] transition-transform duration-200 ease-out",
            join && "translate-x-full",
          )}
        />
        {(["signin", "join"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cx("relative z-10 rounded-[5px] transition-colors", mode === m ? cx("font-semibold", NAVY) : "font-medium text-slate-500 hover:text-slate-800")}
          >
            {m === "signin" ? "Sign in" : "Join now"}
          </button>
        ))}
      </div>

      <div className="mt-[18px] flex flex-col gap-[10px]">
        {join && (
          <label className={cx(wrap, "animate-rise")}>
            <User className={icon} />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Full name" autoComplete="name" maxLength={80} className={input} />
          </label>
        )}
        <label className={wrap}>
          <Mail className={icon} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" autoComplete="email" className={cx(input, "pr-12")} />
          {emailOk && <Check className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-pop text-emerald-600" />}
        </label>
        <label className={wrap}>
          <Lock className={icon} />
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={join ? "Password (8 or more characters)" : "Password"}
            aria-label="Password"
            autoComplete={join ? "new-password" : "current-password"}
            className={cx(input, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </label>
      </div>

      {join && password.length > 0 && (
        <div className="mt-2 animate-rise px-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-full transition-colors duration-200", i <= score ? BAR[score] : "bg-slate-200")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{password.length < 8 ? STRENGTH[0] : STRENGTH[Math.max(1, score)]}</p>
        </div>
      )}
      {!join && (
        <Link href="/auth/forgot-password" className={cx("mt-3 self-start text-[15px]", AUTH_LINK)}>
          Forgot password?
        </Link>
      )}

      {error && (
        <p role="alert" className={cx("mt-3 animate-rise", AUTH_ALERT)}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={cx("mt-[14px]", AUTH_CTA)}
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {join ? "Agree and join" : "Sign in"}
        {!busy && <ArrowRight className="h-[18px] w-[18px] transition-transform duration-150 group-hover:translate-x-1" />}
      </button>

      <p className="mt-[13px] text-center text-[12.5px] text-slate-600 sm:whitespace-nowrap">
        By continuing, you agree to the SMB Hub{" "}
        <Link href="/policies/terms" className="font-semibold text-[#0a66c2] hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/policies/community-guidelines" className="font-semibold text-[#0a66c2] hover:underline">
          Community Guidelines
        </Link>
        .
      </p>
      <p className={cx("mt-[16px] text-center text-[17px]", NAVY)}>
        {join ? "Already on SMB Hub? " : "New to SMB Hub? "}
        <button type="button" onClick={() => setMode(join ? "signin" : "join")} className="ml-2 rounded px-1 font-semibold text-[#0a66c2] hover:underline">
          {join ? "Sign in" : "Join now"}
        </button>
      </p>
    </form>
  );
}

// ---------- the page ----------
function MapleLeaf() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-[#d52b1e]">
      <path d="M12 1.5 10.2 5 8 4.2l.8 5-2.6-2.6-.9 1.9-2.6-.6 1 3.1-1.6.8 4.6 3.7-.7 2.1 4.8-.7-.2 5.6h1.4l-.2-5.6 4.8.7-.7-2.1 4.6-3.7-1.6-.8 1-3.1-2.6.6-.9-1.9-2.6 2.6.8-5-2.2.8z" />
    </svg>
  );
}

/** The supplied Toronto artwork, always shown whole (16:9, never cropped or stretched past its 1280px size). */
function Artwork() {
  const fade = {
    maskImage: "linear-gradient(to right, transparent, black 7%), linear-gradient(to bottom, transparent, black 7%, black 88%, transparent)",
    WebkitMaskImage: "linear-gradient(to right, transparent, black 7%), linear-gradient(to bottom, transparent, black 7%, black 88%, transparent)",
    maskComposite: "intersect",
    WebkitMaskComposite: "source-in",
  } as const;
  return (
    <>
      {/* desktop: the video, beside the form, reaching the right edge of the screen */}
      <div aria-hidden="true" className="hidden min-w-0 flex-1 lg:block">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/auth-bg-poster.jpg"
          className="ml-auto block aspect-video w-full max-w-[1280px] motion-reduce:hidden"
          style={fade}
        >
          <source src="/auth-bg.mp4" type="video/mp4" />
        </video>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/auth-bg.jpg" alt="" className="ml-auto hidden aspect-video w-full max-w-[1280px] motion-reduce:block" style={fade} />
      </div>
      {/* phones and tablets: the still picture as a banner, which saves loading a 5 MB video on mobile data */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth-bg.jpg"
        alt=""
        aria-hidden="true"
        className="block aspect-video max-h-[200px] w-full object-cover sm:max-h-[240px] object-[center_45%] lg:hidden"
        style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent)" }}
      />
    </>
  );
}

export function AuthLanding({ initialMode, notice }: { initialMode: Mode; notice?: string }) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    window.history.replaceState(null, "", m === "join" ? "/auth/sign-up" : "/auth/login");
  };

  return (
    <section className="flex flex-1 flex-col lg:flex-row lg:items-center lg:gap-10 lg:pl-[max(20px,calc((100vw-1270px)/2))]">
      <div className="order-2 mx-auto w-full max-w-[465px] shrink-0 px-5 pb-10 pt-6 lg:order-1 lg:mx-0 lg:px-0 lg:py-8 lg:[@media(max-height:820px)]:py-4">
        <p className={cx("inline-flex items-center gap-2 rounded-md bg-[#e2ecfb] px-3 py-1.5 text-[14px] font-semibold", NAVY)}>
          <MapleLeaf /> Canada&apos;s professional network
        </p>
        <h1 className={cx("mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.015em] sm:text-[44px] xl:text-[48px] lg:[@media(max-height:820px)]:text-[38px]", NAVY)}>
          {mode === "join" ? "Join Canada's small business community" : "Welcome to your small business community"}
        </h1>
        <p className="mt-4 text-[17px] leading-[26px] text-slate-600 lg:[@media(max-height:820px)]:hidden">Connect, learn, and grow with entrepreneurs, professionals, and business leaders across Canada.</p>
        {notice === "link-expired" && (
          <p role="status" className="mt-4 rounded-md bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            That link has expired or was already used. Sign in below, or use Forgot password.
          </p>
        )}
        <div className="mt-5">
          <AuthForm mode={mode} setMode={setMode} />
        </div>
      </div>
      <div className="order-1 flex min-w-0 lg:order-2 lg:flex-1">
        <Artwork />
      </div>
    </section>
  );
}
