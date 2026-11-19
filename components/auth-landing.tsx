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
  MessageSquare,
  ThumbsUp,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Mode = "signin" | "join";
export type LandingStats = { members: number; groups: number; posts: number };

const NAVY = "text-[#0b1437]";
const CTA = "bg-gradient-to-r from-[#3f86ee] to-[#0a2fb8] text-white shadow-[0_8px_20px_-8px_rgb(10_47_184/0.7)]";

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
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
      } else if (data.session) {
        router.push("/profile/edit");
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
      <div className="animate-rise rounded-2xl border border-white bg-white/90 p-6 text-center shadow-[0_12px_40px_-16px_rgb(22_48_122/0.35)] backdrop-blur">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className={cx("mt-4 text-2xl font-semibold", NAVY)}>Check your inbox</h2>
        <p className="mt-2 text-sm text-slate-500">
          We sent a confirmation link to <span className="font-semibold text-slate-800">{sentTo}</span>. Open it to finish joining.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setMode("signin");
          }}
          className="press mt-5 rounded-full border border-[#0b2bcf] px-5 py-2 text-sm font-semibold text-[#0b2bcf] hover:bg-[#0b2bcf]/5"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  const wrap = "relative block";
  const icon = "pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-500";
  const input =
    "h-[42px] w-full rounded-full border border-slate-300 bg-white/90 pl-[52px] pr-5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-[#2f6fe4] focus:bg-white focus:shadow-[0_0_0_4px_rgb(47_111_228/0.15)]";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col">
      {/* instant switch between the two forms */}
      <div className="relative grid h-[42px] grid-cols-2 rounded-full bg-[#e3e9f4] p-[3px] text-[15px]" role="tablist">
        <span
          className={cx(
            "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-white shadow-[0_1px_4px_rgb(15_23_42/0.18)] transition-transform duration-200 ease-out",
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
            className={cx("relative z-10 rounded-full transition-colors", mode === m ? cx("font-semibold", NAVY) : "font-medium text-slate-500 hover:text-slate-800")}
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
          {emailOk && <Check className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-pop text-emerald-600" />}
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
            className={cx(input, "pr-14")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="press absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
        <Link href="/auth/forgot-password" className="mt-[12px] self-start rounded px-1 text-[15px] font-semibold text-[#0b2bcf] hover:underline">
          Forgot password?
        </Link>
      )}

      {error && (
        <p role="alert" className="mt-3 animate-rise rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={cx("press group mt-[14px] flex h-[44px] items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition-all duration-150 hover:brightness-110 disabled:opacity-70", CTA)}
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" />}
        {join ? "Agree and join" : "Sign in"}
        {!busy && <ArrowRight className="h-[18px] w-[18px] transition-transform duration-150 group-hover:translate-x-1" />}
      </button>

      <p className="mt-[13px] text-center text-[12.5px] text-slate-600 sm:whitespace-nowrap">
        By continuing, you agree to the SMB Hub{" "}
        <Link href="/policies/terms" className="font-semibold text-[#0b2bcf] hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/policies/community-guidelines" className="font-semibold text-[#0b2bcf] hover:underline">
          Community Guidelines
        </Link>
        .
      </p>
      <p className={cx("mt-[16px] text-center text-[17px]", NAVY)}>
        {join ? "Already on SMB Hub? " : "New to SMB Hub? "}
        <button type="button" onClick={() => setMode(join ? "signin" : "join")} className="ml-2 rounded px-1 font-semibold text-[#0b2bcf] hover:underline">
          {join ? "Sign in" : "Join now"}
        </button>
      </p>
    </form>
  );
}

// ---------- two sample cards on the right ----------
function Showcase({ people }: { people: Author[] }) {
  const [likes, setLikes] = useState(24);
  const [liked, setLiked] = useState(false);
  const [invite, setInvite] = useState<"open" | "accepted" | "ignored">("open");
  const person = (name: string, i: number): Author =>
    people.find((p) => p.full_name === name) ?? people[i] ?? { id: `showcase-${i}`, full_name: name, headline: "", avatar_url: null, member_type: "owner" };
  const priya = person("Priya Raman", 0);
  const daniel = person("Daniel Okafor", 1);
  const card = "rounded-xl border border-white/80 bg-white shadow-[0_24px_60px_-24px_rgb(15_35_95/0.45)]";

  return (
    <div className="relative mx-auto hidden w-full max-w-[470px] self-center lg:block">
      {/* a post from the feed */}
      <div className={cx(card, "p-5")}>
        <div className="flex items-center gap-3">
          <AvatarImg person={priya} size={48} />
          <div className="min-w-0 flex-1 text-left">
            <p className={cx("truncate text-[15px] font-semibold", NAVY)}>{priya.full_name}</p>
            <p className="truncate text-[13px] text-slate-500">{priya.headline || "Founder, Maple Bakery"}, 35m ago</p>
          </div>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800">Win</span>
        </div>
        <p className="mt-4 text-left text-[15px] leading-[23px] text-slate-800">
          We just closed our first wholesale account with a national grocer. It took 14 months and three rejected samples.
        </p>
        <div className="mt-4 flex items-center gap-6 border-t border-slate-200 pt-3 text-[14px] text-slate-700">
          <button
            type="button"
            aria-label="Like this sample post"
            onClick={() => {
              setLiked((l) => !l);
              setLikes((n) => n + (liked ? -1 : 1));
            }}
            className={cx("press inline-flex items-center gap-2 rounded px-1 transition-colors", liked && "text-[#0b2bcf]")}
          >
            <ThumbsUp className={cx("h-[18px] w-[18px]", liked && "fill-[#0b2bcf]/15")} />
            {likes}
          </button>
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-[18px] w-[18px]" /> 6
          </span>
        </div>
      </div>

      {/* an invitation to connect */}
      <div className={cx(card, "ml-auto mt-5 w-[340px] p-4")}>
        <div className="flex items-center gap-3">
          <AvatarImg person={daniel} size={48} />
          <div className="min-w-0 flex-1 text-left">
            <p className={cx("truncate text-[15px] font-semibold", NAVY)}>{daniel.full_name}</p>
            <p className="text-[13px] text-slate-500">
              {invite === "accepted" ? "You are now connected" : invite === "ignored" ? "Invitation ignored" : "invited you to connect"}
            </p>
          </div>
        </div>
        {invite === "open" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInvite("ignored")}
              className="press flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <X className="h-4 w-4" /> Ignore
            </button>
            <button
              type="button"
              onClick={() => setInvite("accepted")}
              className="press flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#1657cf] text-[14px] font-semibold text-white transition-colors hover:bg-[#0f47b5]"
            >
              <Check className="h-4 w-4" /> Accept
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setInvite("open")}
            className={cx("press mt-4 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold", invite === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}
          >
            {invite === "accepted" && <UserCheck className="h-4 w-4" />}
            {invite === "accepted" ? "Connected" : "Undo"}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- the page ----------
export function AuthLanding({ initialMode, people }: { initialMode: Mode; stats: LandingStats; people: Author[] }) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    window.history.replaceState(null, "", m === "join" ? "/auth/sign-up" : "/auth/login");
  };

  return (
    <>
      <section className="mx-auto grid max-w-[1270px] items-start gap-6 px-5 pb-12 pt-9 xl:px-0 lg:grid-cols-[minmax(0,465px)_minmax(0,1fr)] lg:gap-[52px]">
        <div className="mx-auto w-full max-w-[465px] lg:mx-0">
          <p className={cx("inline-flex items-center gap-2.5 rounded-full bg-[#e2ecfb] px-5 py-1.5 text-[15px] font-semibold", NAVY)}>
            <span aria-hidden="true">🇨🇦</span> Canada&apos;s Small Business Network
          </p>
          <h1 className={cx("mt-[18px] text-[38px] font-semibold leading-[1.08] tracking-[-0.015em] sm:text-[50px]", NAVY)}>
            {mode === "join" ? "Join Canada's small business community" : "Welcome to your small business community"}
          </h1>
          <p className="mt-[18px] text-[18px] leading-[27px] text-slate-600">Connect, learn, and grow with entrepreneurs, professionals, and business leaders across Canada.</p>
          <div className="mt-[18px]">
            <AuthForm mode={mode} setMode={setMode} />
          </div>
        </div>
        <Showcase people={people} />
      </section>
    </>
  );
}
