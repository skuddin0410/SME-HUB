"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { confirmDevice, signIn, type Fields, type Who } from "@/app/auth/actions";
import { WelcomeCard, pulseCity } from "./welcome";
import { CodeBoxes, Err, LockIcon, PasswordField, Spin } from "./fields";
import { Sso } from "./sso";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Msg = { kind: "e" | "w" | "i" | "s"; body: React.ReactNode } | null;

const LOCKED = (
  <span>
    <b>Too many tries.</b>For your security, logging in is paused for 15 minutes. You can <Link href="/auth/forgot-password">reset your password</Link> now instead. We’ve emailed you about this.
  </span>
);

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [keep, setKeep] = useState(true);
  const [errs, setErrs] = useState<Fields>({});
  const [msg, setMsg] = useState<Msg>(
    notice === "link-expired"
      ? { kind: "i", body: <span>That link has already been used or has expired. Log in below, or <Link href="/auth/forgot-password">reset your password</Link>.</span> }
      : notice === "signed-out"
        ? { kind: "s", body: <span>You’re signed out. See you soon.</span> }
        : null,
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ who: Who | null } | null>(null);
  const [ticked, setTicked] = useState(false);
  const [step, setStep] = useState<"form" | "code">("form");
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(true);
  const [codeErr, setCodeErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const em = email.trim();
    setMsg(null);
    setErrs({});
    if (!EMAIL.test(em)) {
      setErrs({ em: em ? "Check your email address." : "Enter your email address." });
      return void document.getElementById("em")?.focus();
    }
    if (!pw) {
      setErrs({ pw: "Enter your password." });
      return void document.getElementById("pw")?.focus();
    }
    setBusy(true);
    const res = await signIn({ email: em, password: pw, keep });
    setBusy(false);
    switch (res.status) {
      case "ok":
        return welcome(res.who);
      case "code":
        setCode("");
        setCodeErr("");
        return setStep("code");
      case "locked":
        return setMsg({ kind: "w", body: LOCKED });
      case "wrong":
        setPw("");
        setMsg({
          kind: "e",
          body: (
            <span>
              <b>That email and password don’t match.</b>Try again or <Link href="/auth/forgot-password">reset your password</Link>.
              {res.remaining <= 2 ? ` ${res.remaining} ${res.remaining === 1 ? "try" : "tries"} left before we pause logins for 15 minutes.` : ""}
            </span>
          ),
        });
        return void document.getElementById("pw")?.focus();
      case "unconfirmed":
        return setMsg({
          kind: "i",
          body: (
            <span>
              <b>Confirm your email first.</b>We sent a 6-digit code to {em}. <Link href={`/auth/verify?email=${encodeURIComponent(em)}`}>Enter the code</Link>.
            </span>
          ),
        });
      case "busy":
        return setMsg({ kind: "e", body: <span>Too many attempts. Wait a minute, then try again.</span> });
      case "invalid":
        return setErrs(res.fields);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (code.length < 6) return setCodeErr("Enter all 6 digits.");
    setCodeErr("");
    setBusy(true);
    const res = await confirmDevice({ email: email.trim(), password: pw, code, trust, keep });
    setBusy(false);
    if (!res.ok) return setCodeErr(res.error);
    welcome(res.who);
  };

  /**
   * After a successful log-in: the button shows a green tick, the card lifts away, rings pulse from the member's
   * city on the map and "Welcome back" appears; then the Home page opens. The page is fetched while this plays,
   * so it adds about a second. With reduced motion the Home page opens straight away.
   */
  const welcome = (who: Who | null) => {
    router.prefetch(next);
    const go = () => {
      router.push(next);
      router.refresh();
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone({ who });
      return go();
    }
    setTicked(true);
    window.setTimeout(() => {
      setDone({ who });
      pulseCity(who);
    }, 560);
    window.setTimeout(go, 2000);
  };

  if (done) return <WelcomeCard who={done.who} />;

  if (step === "code") {
    return (
      <section className="card">
        <div className="center">
          <div className="icon"><LockIcon /></div>
          <h1>Confirm it’s you</h1>
          <p className="sub">
            You’re logging in from a new device. We emailed a 6-digit code to <span className="mail">{email.trim()}</span>.
          </p>
          <form onSubmit={submitCode} noValidate>
            <CodeBoxes value={code} onChange={setCode} invalid={Boolean(codeErr)} autoFocus />
            <div className="er" style={{ justifyContent: "center", margin: "-6px 0 12px" }}>{codeErr}</div>
            <label className="cb" style={{ justifyContent: "center" }}>
              <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
              <span>Trust this device for 30 days</span>
            </label>
            <button className="btn p" type="submit" disabled={busy || ticked}>
              {busy ? (<><Spin />Checking</>) : "Continue"}
            </button>
          </form>
          <p className="hint" style={{ marginTop: 14 }}>
            <button type="button" className="linkbtn" onClick={() => { setStep("form"); setPw(""); setCode(""); }}>
              Use a different account
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`card${ticked ? " leaving" : ""}`}>
      <div>
        <h1 id="h">Welcome back</h1>
        <p className="sub">Log in to see your network, messages and business page.</p>
        <div id="msg" aria-live="polite">
          {msg && (
            <div className={`alert ${msg.kind}`} role="alert">
              {msg.body}
            </div>
          )}
        </div>
        <Sso onNote={(t) => setMsg({ kind: "i", body: <span>{t}</span> })} />
        <div className="or">or log in with email</div>
        <form onSubmit={submit} noValidate>
          <div className="f">
            <label className="l" htmlFor="em">Email</label>
            <input className="t" id="em" type="email" autoComplete="username" placeholder="you@yourbusiness.ca" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errs.em ? "true" : "false"} aria-describedby="em-err" />
            <Err id="em">{errs.em}</Err>
          </div>
          <PasswordField
            id="pw"
            label="Password"
            labelExtra={<Link href="/auth/forgot-password">Forgot password?</Link>}
            value={pw}
            onChange={setPw}
            error={errs.pw}
            autoComplete="current-password"
          />
          <label className="cb">
            <input type="checkbox" id="kp" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
            <span>Keep me logged in on this device</span>
          </label>
          <button className={`btn p${ticked ? " ok" : ""}`} type="submit" id="go" disabled={busy || ticked}>
            {ticked ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                Logged in
              </>
            ) : busy ? (<><Spin />Logging in</>) : "Log in"}
          </button>
        </form>
        <p className="foot">New to SME Hub? <Link href="/auth/sign-up">Join free</Link></p>
      </div>
    </section>
  );
}
