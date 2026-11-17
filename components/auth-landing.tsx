"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Loader2, MailCheck, MessageSquareText, ThumbsUp, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Author } from "@/lib/hub";
import { AvatarImg } from "@/components/hub-client";

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

type Mode = "signin" | "join";
export type LandingStats = { members: number; groups: number; posts: number };

const TOPICS = [
  { label: "Questions from owners", href: "/feed?kind=question" },
  { label: "Wins", href: "/feed?kind=win" },
  { label: "Offers", href: "/feed?kind=offer" },
  { label: "Hiring", href: "/feed?kind=hiring" },
  { label: "Groups", href: "/groups" },
  { label: "Business directory", href: "/businesses" },
  { label: "Members", href: "/members" },
  { label: "Membership plans", href: "/membership-plans" },
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
  const first = useRef<HTMLInputElement>(null);
  const join = mode === "join";
  const score = strength(password);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = emailOk && (join ? name.trim().length > 1 && password.length >= 8 : password.length > 0);

  useEffect(() => {
    setError(null);
    first.current?.focus({ preventScroll: true });
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
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
      <div className="animate-rise rounded-2xl border bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-2xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-semibold text-foreground">{sentTo}</span>. Open it to finish joining.
        </p>
        <button type="button" onClick={() => { setSentTo(null); setMode("signin"); }} className="press mt-5 rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/10">
          Back to sign in
        </button>
      </div>
    );
  }

  const input = "peer w-full rounded-full border border-foreground/60 bg-white px-5 pb-2 pt-5 text-base outline-none transition placeholder:text-transparent hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.6)] focus:border-primary focus:shadow-[inset_0_0_0_1px_hsl(var(--primary))]";
  const label = "pointer-events-none absolute left-5 top-3.5 origin-left text-base text-muted-foreground transition-all duration-150 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      {/* instant switch between the two forms */}
      <div className="relative mb-1 grid grid-cols-2 rounded-full bg-[hsl(214_45%_93%)] p-1 text-sm font-semibold" role="tablist">
        <span className={cx("absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-white shadow transition-transform duration-200 ease-out", join ? "translate-x-[calc(100%+4px)]" : "translate-x-1")} />
        {(["signin", "join"] as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx("relative z-10 rounded-full py-2 transition-colors", mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {m === "signin" ? "Sign in" : "Join now"}
          </button>
        ))}
      </div>

      {join && (
        <label className="relative block animate-rise">
          <input ref={first} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" maxLength={80} className={input} />
          <span className={label}>Full name</span>
        </label>
      )}
      <label className="relative block">
        <input ref={join ? undefined : first} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" className={input} />
        <span className={label}>Email</span>
        {emailOk && <Check className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 animate-pop text-emerald-600" />}
      </label>
      <label className="relative block">
        <input
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={join ? "new-password" : "current-password"}
          className={cx(input, "pr-16")}
        />
        <span className={label}>{join ? "Password (8 or more characters)" : "Password"}</span>
        <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="press absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </label>

      {join && password.length > 0 && (
        <div className="animate-rise px-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cx("h-1 flex-1 rounded-full transition-colors duration-200", i <= score ? BAR[score] : "bg-muted")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{password.length < 8 ? STRENGTH[0] : STRENGTH[Math.max(1, score)]}</p>
        </div>
      )}
      {!join && (
        <Link href="/auth/forgot-password" className="self-start rounded px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 hover:underline">
          Forgot password?
        </Link>
      )}

      {error && <p role="alert" className="animate-rise rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      <button
        type="submit"
        disabled={!ready || busy}
        className="press group mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-primary text-base font-semibold text-white transition-all duration-150 hover:bg-[hsl(224_76%_44%)] disabled:bg-[hsl(214_30%_85%)] disabled:text-white"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {join ? "Agree and join" : "Sign in"}
        {!busy && <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />}
      </button>

      <p className="px-4 text-center text-xs leading-5 text-muted-foreground">
        By continuing you agree to the SMB Hub{" "}
        <a href="https://smehub.ca/general-terms-conditions/" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Terms</a>{" "}
        and{" "}
        <a href="https://smehub.ca/small-business-hub-community-guidelines/" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Community Guidelines</a>.
      </p>
      <p className="mt-2 text-center text-base">
        {join ? "Already on SMB Hub? " : "New to SMB Hub? "}
        <button type="button" onClick={() => setMode(join ? "signin" : "join")} className="rounded px-1 font-semibold text-primary hover:bg-primary/10 hover:underline">
          {join ? "Sign in" : "Join now"}
        </button>
      </p>
    </form>
  );
}

// ---------- the live showcase on the right ----------
function Showcase({ people }: { people: Author[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const [likes, setLikes] = useState(24);
  const [liked, setLiked] = useState(false);
  const [connected, setConnected] = useState(false);
  const p = (i: number): Author => people[i % Math.max(1, people.length)] ?? { id: `demo-${i}`, full_name: ["Priya Raman", "Daniel Okafor", "Mei Tanaka"][i % 3], headline: "", avatar_url: null, member_type: "owner" };

  // cards drift slightly with the pointer, each at its own depth
  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
      el.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const layer = (depth: number) => ({ transform: `translate3d(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px), 0)`, transition: "transform 0.25s ease-out" });
  const card = "absolute rounded-xl border bg-white shadow-[0_12px_40px_-12px_rgb(22_48_122/0.35)]";

  return (
    <div ref={stage} className="relative mx-auto hidden h-[520px] w-full max-w-[560px] lg:block" aria-hidden="true">
      {/* backdrop */}
      <div className="absolute inset-6 rounded-[44%_56%_52%_48%/48%_44%_56%_52%] bg-gradient-to-br from-[hsl(214_90%_93%)] via-[hsl(220_90%_96%)] to-[hsl(350_90%_96%)]" style={layer(-10)} />
      <div className="absolute right-10 top-8 h-20 w-20 rounded-full bg-rose-500/90" style={layer(-26)} />
      <div className="absolute bottom-10 left-6 h-14 w-14 rounded-2xl bg-primary" style={layer(-34)} />
      <div className="absolute left-24 top-6 h-4 w-4 rounded-full bg-amber-400" style={layer(-50)} />

      {/* a post you can actually like */}
      <div className={cx(card, "float-a left-10 top-20 w-[330px] p-4")} style={layer(18)}>
        <div className="flex items-center gap-3">
          <AvatarImg person={p(0)} size={44} />
          <div className="min-w-0 text-left">
            <p className="truncate text-sm"><span className="font-semibold">{p(0).full_name}</span> <span className="text-muted-foreground">shared a win</span></p>
            <p className="text-xs text-muted-foreground">35m ago</p>
          </div>
        </div>
        <p className="mt-3 text-left text-sm leading-5">We just closed our first wholesale account with a national grocer. Took 14 months and three rejected samples.</p>
        <div className="pointer-events-auto mt-3 flex items-center gap-4 border-t pt-2 text-sm text-foreground/70">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => { setLiked((l) => !l); setLikes((n) => n + (liked ? -1 : 1)); }}
            className={cx("press inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-muted", liked && "text-primary")}
          >
            <ThumbsUp key={String(liked)} className={cx("h-4 w-4", liked && "animate-pop fill-primary/20")} />
            {likes}
          </button>
          <span className="inline-flex items-center gap-1.5"><MessageSquareText className="h-4 w-4" /> 6</span>
        </div>
      </div>

      {/* an invitation you can accept */}
      <div className={cx(card, "float-b right-2 top-[250px] w-[270px] p-3")} style={layer(34)}>
        <div className="flex items-center gap-3">
          <AvatarImg person={p(1)} size={48} />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">{p(1).full_name}</p>
            <p className="text-xs text-muted-foreground">{connected ? "You are now connected" : "invited you to connect"}</p>
          </div>
        </div>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setConnected((c) => !c)}
          className={cx("press pointer-events-auto mt-3 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-semibold transition-colors duration-150", connected ? "bg-emerald-50 text-emerald-700" : "border border-primary text-primary hover:bg-primary/10")}
        >
          {connected ? <UserCheck className="h-4 w-4 animate-pop" /> : <Check className="h-4 w-4" />}
          {connected ? "Connected" : "Accept"}
        </button>
      </div>

      {/* a message */}
      <div className={cx(card, "float-c bottom-12 left-20 flex w-[290px] items-start gap-3 p-3")} style={layer(48)}>
        <AvatarImg person={p(2)} size={40} />
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold">{p(2).full_name} <span className="text-xs font-normal text-muted-foreground">10:54 p.m.</span></p>
          <p className="text-sm leading-5">Sure, sending the sell sheet template tonight.</p>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white" />
      </div>

      {/* a group chip */}
      <div className={cx(card, "float-b left-2 top-4 flex items-center gap-2 px-3 py-2")} style={layer(60)}>
        <span className="flex -space-x-2">
          {[3, 4, 5].map((i) => (
            <span key={i} className="rounded-full ring-2 ring-white"><AvatarImg person={p(i)} size={26} /></span>
          ))}
        </span>
        <span className="text-xs font-semibold">AI for Small Business</span>
      </div>
    </div>
  );
}

// ---------- the page ----------
export function AuthLanding({ initialMode, stats, people }: { initialMode: Mode; stats: LandingStats; people: Author[] }) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const top = useRef<HTMLDivElement>(null);
  const setMode = (m: Mode) => {
    setModeState(m);
    window.history.replaceState(null, "", m === "join" ? "/auth/sign-up" : "/auth/login");
  };
  const getStarted = () => {
    setMode("join");
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const figure = (n: number, word: string) => (n > 0 ? `${n.toLocaleString("en-CA")} ${word}` : null);
  const proof = [figure(stats.members, "members"), figure(stats.groups, "groups"), figure(stats.posts, "posts")].filter(Boolean);

  return (
    <>
      <section ref={top} className="mx-auto grid max-w-[1128px] scroll-mt-24 items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:pt-12">
        <div className="mx-auto w-full max-w-[440px] lg:mx-0">
          <h1 className="text-[40px] font-light leading-[1.15] tracking-tight text-[hsl(var(--ink))] sm:text-[52px]">
            {mode === "join" ? "Join Canada's small business community" : "Welcome to your small business community"}
          </h1>
          <div className="mt-7">
            <AuthForm mode={mode} setMode={setMode} />
          </div>
        </div>
        <Showcase people={people} />
      </section>

      <section className="bg-[hsl(220_33%_95%)]">
        <div className="mx-auto grid max-w-[1128px] gap-8 px-4 py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <h2 className="text-[32px] font-light leading-tight text-[hsl(var(--ink))]">Explore what owners are talking about</h2>
            <p className="mt-2 text-lg text-foreground/70">Browse without an account. Join when you want to take part.</p>
          </div>
          <div className="flex flex-wrap content-start gap-3">
            {TOPICS.map((t) => (
              <Link key={t.href} href={t.href} className="press rounded-full border border-foreground/60 bg-transparent px-5 py-3 text-base font-semibold text-foreground/75 transition-all duration-150 hover:bg-white hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.6)]">
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-[hsl(214_90%_95%)] to-white">
        <div className="mx-auto max-w-[1128px] px-4 py-16">
          <h2 className="max-w-3xl text-[36px] font-light leading-tight text-[hsl(var(--ink))] sm:text-[44px]">
            Join the owners, founders and advisors already on SMB Hub
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <button type="button" onClick={getStarted} className="press group inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-base font-semibold text-white transition-colors hover:bg-[hsl(224_76%_44%)]">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
            </button>
            {people.length > 0 && (
              <span className="flex items-center gap-3">
                <span className="flex -space-x-3">
                  {people.slice(0, 6).map((m) => (
                    <span key={m.id} className="rounded-full ring-2 ring-white transition-transform duration-150 hover:z-10 hover:-translate-y-1"><AvatarImg person={m} size={40} /></span>
                  ))}
                </span>
                {proof.length > 0 && <span className="text-sm text-foreground/70">{proof.join(", ")}</span>}
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
