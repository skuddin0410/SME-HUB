"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Check,
  Ellipsis,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  MessageCircle,
  MessageSquare,
  Tag,
  ThumbsUp,
  Trophy,
  User,
  UserCheck,
  Users,
  UsersRound,
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

const TOPICS = [
  { label: "Questions from owners", href: "/feed?kind=question", icon: MessageCircle, tone: "text-[#0b2bcf]" },
  { label: "Wins", href: "/feed?kind=win", icon: Trophy, tone: "text-amber-500" },
  { label: "Offers", href: "/feed?kind=offer", icon: Tag, tone: "text-[#0b2bcf]" },
  { label: "Hiring", href: "/feed?kind=hiring", icon: Briefcase, tone: "text-[#0b2bcf]" },
  { label: "Groups", href: "/groups", icon: UsersRound, tone: "text-[#0b2bcf]" },
  { label: "Business directory", href: "/businesses", icon: Building2, tone: "text-[#0b2bcf]" },
  { label: "Members", href: "/members", icon: Users, tone: "text-[#0b2bcf]" },
  { label: "Membership plans", href: "/membership-plans", icon: Layers, tone: "text-[#0b2bcf]" },
];

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
        <h2 className={cx("mt-4 text-2xl font-bold", NAVY)}>Check your inbox</h2>
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
            className={cx("relative z-10 rounded-full transition-colors", mode === m ? cx("font-bold", NAVY) : "font-medium text-slate-500 hover:text-slate-800")}
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
        <a href="https://smehub.ca/general-terms-conditions/" target="_blank" rel="noreferrer" className="font-semibold text-[#0b2bcf] hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="https://smehub.ca/small-business-hub-community-guidelines/" target="_blank" rel="noreferrer" className="font-semibold text-[#0b2bcf] hover:underline">
          Community Guidelines
        </a>
        .
      </p>
      <p className={cx("mt-[16px] text-center text-[17px]", NAVY)}>
        {join ? "Already on SMB Hub? " : "New to SMB Hub? "}
        <button type="button" onClick={() => setMode(join ? "signin" : "join")} className="ml-2 rounded px-1 font-bold text-[#0b2bcf] hover:underline">
          {join ? "Sign in" : "Join now"}
        </button>
      </p>
    </form>
  );
}

// ---------- the live cards on the right ----------
function Showcase({ people, members }: { people: Author[]; members: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const [likes, setLikes] = useState(24);
  const [liked, setLiked] = useState(false);
  const [invite, setInvite] = useState<"open" | "accepted" | "ignored">("open");
  const names = ["Priya Raman", "Daniel Okafor", "Mei Tanaka"];
  const person = (name: string, i: number): Author =>
    people.find((p) => p.full_name === name) ?? people[i] ?? { id: `showcase-${i}`, full_name: name, headline: "", avatar_url: null, member_type: "owner" };
  const [priya, daniel, mei] = names.map(person);
  const faces = people.filter((p) => !names.includes(p.full_name)).slice(0, 3);

  // cards drift slightly with the pointer, each at its own depth
  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", String(Math.max(-0.6, Math.min(0.6, (e.clientX - r.left) / r.width - 0.5))));
      el.style.setProperty("--my", String(Math.max(-0.6, Math.min(0.6, (e.clientY - r.top) / r.height - 0.5))));
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const layer = (depth: number) => ({ transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`, transition: "transform 0.25s ease-out" });
  const card = "absolute rounded-2xl bg-white shadow-[0_18px_48px_-16px_rgb(22_48_122/0.45)]";
  const tile = "absolute flex items-center justify-center rounded-2xl border-2 border-white/70 bg-gradient-to-br from-[#6fa0f4] to-[#2f5fe0] text-white shadow-[0_12px_28px_-10px_rgb(30_70_200/0.7)]";

  return (
    <div ref={stage} className="relative mx-auto hidden h-[590px] w-full max-w-[760px] lg:block">
      {/* dot grid */}
      <div className="absolute left-[2px] top-[128px] grid grid-cols-4 gap-x-[11px] gap-y-[11px]" style={layer(-14)} aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="h-[3px] w-[3px] rounded-full bg-[#7fa2e6]" />
        ))}
      </div>

      {/* floating tiles */}
      <span className={cx(tile, "float-b right-[56px] top-[22px] h-[74px] w-[74px]")} style={layer(52)} aria-hidden="true">
        <Briefcase className="h-8 w-8" />
      </span>
      <span className={cx(tile, "float-c left-[8px] top-[412px] h-[68px] w-[68px]")} style={layer(40)} aria-hidden="true">
        <BarChart3 className="h-8 w-8" />
      </span>
      <span className={cx(tile, "float-a right-[88px] top-[504px] h-[68px] w-[68px]")} style={layer(58)} aria-hidden="true">
        <Users className="h-8 w-8 fill-white" />
      </span>

      {/* group chip */}
      <div className={cx(card, "float-b left-[108px] top-[70px] flex items-center gap-3 !rounded-[18px] py-2.5 pl-4 pr-5")} style={layer(30)}>
        <span className="flex -space-x-2.5">
          {(faces.length ? faces : [priya, daniel, mei]).map((p) => (
            <span key={p.id} className="rounded-full ring-2 ring-white">
              <AvatarImg person={p} size={34} />
            </span>
          ))}
        </span>
        <span className="text-left leading-tight">
          <span className={cx("block text-[14px] font-bold", NAVY)}>AI for Small Business</span>
          <span className="block text-[13px] text-slate-600">{members > 0 ? `${members.toLocaleString("en-CA")} members on SMB Hub` : "Open group"}</span>
        </span>
      </div>

      {/* a post you can like */}
      <div className={cx(card, "float-a left-[82px] top-[126px] w-[378px] px-5 pb-4 pt-5")} style={layer(18)}>
        <div className="flex items-start gap-3">
          <AvatarImg person={priya} size={52} />
          <p className="min-w-0 flex-1 pt-2.5 text-left text-[15px]">
            <span className={cx("font-bold", NAVY)}>{priya.full_name}</span>
            <span className="text-slate-500"> · 35m ago</span>
          </p>
          <Ellipsis className="mt-1 h-5 w-5 text-slate-700" aria-hidden="true" />
        </div>
        <p className="mt-3 text-left text-[16px] leading-[23px] text-slate-800">We just closed our first wholesale account with a national grocer. Took 14 months and three rejected samples.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["#Growth", "#Wholesale", "#SmallBusiness"].map((t) => (
            <span key={t} className="rounded-full bg-[#e8effc] px-3 py-1 text-[13px] font-medium text-[#0b2bcf]">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-3.5 flex items-center gap-7 border-t border-slate-200 pt-3 text-[15px] font-medium text-slate-800">
          <button
            type="button"
            aria-label="Like this sample post"
            onClick={() => {
              setLiked((l) => !l);
              setLikes((n) => n + (liked ? -1 : 1));
            }}
            className={cx("press inline-flex items-center gap-2 rounded px-1 transition-colors", liked && "text-[#0b2bcf]")}
          >
            <ThumbsUp key={String(liked)} className={cx("h-5 w-5", liked && "animate-pop fill-[#0b2bcf]/15")} />
            {likes}
          </button>
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> 6
          </span>
        </div>
      </div>

      {/* an invitation you can answer */}
      <div className={cx(card, "float-b right-[8px] top-[316px] w-[308px] p-4", invite === "ignored" && "opacity-60")} style={layer(34)}>
        <div className="flex items-center gap-3.5">
          <AvatarImg person={daniel} size={58} />
          <div className="min-w-0 flex-1 text-left">
            <p className={cx("truncate text-[16px] font-bold", NAVY)}>{daniel.full_name}</p>
            <p className="text-[13px] text-slate-600">{invite === "accepted" ? "You are now connected" : invite === "ignored" ? "Invitation ignored" : "invited you to connect"}</p>
          </div>
        </div>
        {invite === "open" ? (
          <div className="mt-3.5 grid grid-cols-[120px_1fr] gap-3">
            <button type="button" onClick={() => setInvite("ignored")} className="press flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-300 text-[14px] font-medium text-slate-800 transition-colors hover:bg-slate-50">
              <X className="h-4 w-4" /> Ignore
            </button>
            <button type="button" onClick={() => setInvite("accepted")} className="press flex h-9 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2f7de8] to-[#1657cf] text-[14px] font-semibold text-white transition hover:brightness-110">
              <Check className="h-4 w-4" /> Accept
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setInvite("open")}
            className={cx("press mt-3.5 flex h-9 w-full animate-rise items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold", invite === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}
          >
            {invite === "accepted" && <UserCheck className="h-4 w-4 animate-pop" />}
            {invite === "accepted" ? "Connected" : "Undo"}
          </button>
        )}
      </div>

      {/* a message */}
      <div className={cx(card, "float-c left-[132px] top-[450px] flex w-[336px] items-start gap-3.5 p-4")} style={layer(46)}>
        <AvatarImg person={mei} size={56} />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[15px]">
            <span className={cx("font-bold", NAVY)}>{mei.full_name}</span>
            <span className="text-slate-500"> · 10:54 pm</span>
          </p>
          <p className="mt-0.5 text-[16px] leading-[22px] text-slate-800">Sure, sending the sell sheet template tonight.</p>
        </div>
        <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
      </div>
    </div>
  );
}

// ---------- the page ----------
export function AuthLanding({ initialMode, stats, people }: { initialMode: Mode; stats: LandingStats; people: Author[] }) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    window.history.replaceState(null, "", m === "join" ? "/auth/sign-up" : "/auth/login");
  };

  return (
    <>
      <section className="mx-auto grid max-w-[1270px] items-start gap-6 px-5 pb-6 pt-9 xl:px-0 lg:grid-cols-[minmax(0,465px)_minmax(0,1fr)] lg:gap-[52px]">
        <div className="mx-auto w-full max-w-[465px] lg:mx-0">
          <p className={cx("inline-flex items-center gap-2.5 rounded-full bg-[#e2ecfb] px-5 py-1.5 text-[15px] font-semibold", NAVY)}>
            <span aria-hidden="true">🇨🇦</span> Canada&apos;s Small Business Network
          </p>
          <h1 className={cx("mt-[18px] text-[40px] font-extrabold leading-[1] tracking-[-0.02em] sm:text-[54px]", NAVY)}>
            {mode === "join" ? "Join Canada's small business community" : "Welcome to your small business community"}
          </h1>
          <p className="mt-[18px] text-[18px] leading-[27px] text-slate-600">Connect, learn, and grow with entrepreneurs, professionals, and business leaders across Canada.</p>
          <div className="mt-[18px]">
            <AuthForm mode={mode} setMode={setMode} />
          </div>
        </div>
        <Showcase people={people} members={stats.members} />
      </section>

      <section className="mx-auto max-w-[1527px] px-4 pb-10">
        <div className="grid items-center gap-8 rounded-[28px] border border-white bg-white/70 px-6 py-9 shadow-[0_10px_50px_-24px_rgb(22_48_122/0.35)] backdrop-blur-md lg:grid-cols-[minmax(0,416px)_1px_minmax(0,1fr)] lg:gap-x-10 lg:py-[34px] lg:pl-[88px] lg:pr-[40px]">
          <div>
            <h2 className={cx("text-[32px] font-normal leading-[1.08] tracking-[-0.01em] sm:text-[38px]", NAVY)}>
              Explore what owners are <span className="font-extrabold text-[#0b2bcf]">talking about</span>
            </h2>
            <p className="mt-3 text-[15px] text-slate-600 xl:whitespace-nowrap">Browse without an account. Join when you want to take part.</p>
          </div>
          <span className="hidden h-[116px] w-px bg-slate-200 lg:block" aria-hidden="true" />
          <div className="flex flex-wrap content-start gap-x-[15px] gap-y-[14px]">
            {TOPICS.map(({ label, href, icon: Icon, tone }) => (
              <Link
                key={href}
                href={href}
                className={cx(
                  "press inline-flex h-[54px] items-center gap-[18px] rounded-2xl border border-slate-100 bg-white px-[22px] text-[16px] font-medium shadow-[0_4px_16px_-8px_rgb(22_48_122/0.3)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_rgb(22_48_122/0.45)]",
                  NAVY,
                )}
              >
                <Icon className={cx("h-6 w-6", tone)} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
