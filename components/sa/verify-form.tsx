"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resendCode, verifyCode } from "@/app/auth/actions";
import { CheckIcon, CodeBoxes, MailIcon, Spin, useCountdown } from "./fields";
import { BotCheck, type BotCheckHandle } from "./bot-check";

export function VerifyForm({ email: emailFromUrl }: { email: string }) {
  const [email, setEmail] = useState(emailFromUrl);
  const [first, setFirst] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const cd = useCountdown();
  const h1 = useRef<HTMLHeadingElement>(null);
  const bot = useRef<BotCheckHandle>(null);

  useEffect(() => {
    try {
      if (!emailFromUrl) setEmail(sessionStorage.getItem("hub.email") ?? "");
      setFirst(sessionStorage.getItem("hub.first") ?? "");
    } catch {}
  }, [emailFromUrl]);
  useEffect(() => {
    if (done) h1.current?.focus();
  }, [done]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (code.length < 6) return setErr("Enter all 6 digits.");
    setErr("");
    setBusy(true);
    const captcha = (await bot.current?.token()) ?? "";
    const res = await verifyCode(email, code, captcha);
    bot.current?.reset();
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    if (res.first) setFirst(res.first);
    setDone(true);
  };

  const again = async () => {
    cd.start(30);
    setErr("");
    const captcha = (await bot.current?.token()) ?? "";
    const r = await resendCode(email, captcha);
    bot.current?.reset();
    setSent(r.ok);
    if (!r.ok) setErr("We could not send a new code right now. Try again in a few minutes.");
  };

  if (done) {
    return (
      <section className="card" aria-live="polite">
        <div className="center">
          <div className="icon ok"><CheckIcon /></div>
          <h1 ref={h1} tabIndex={-1}>You’re in, {first || "there"}!</h1>
          <p className="sub">Your email is confirmed and your welcome email is on its way. Let’s set up your profile so the right people can find you.</p>
          <Link className="btn p" href="/feed">Set up my profile</Link>
          <p className="hint" style={{ marginTop: 14 }}>It takes about 3 minutes. AI can write your introduction for you.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-live="polite">
      <div className="center">
        <div className="icon"><MailIcon /></div>
        <h1 id="h">Check your email</h1>
        <p className="sub">
          We sent a 6-digit code to <span className="mail">{email || "your email address"}</span>. Enter it below to confirm your email.
        </p>
        {sent && (
          <div className="alert s" role="status"><span>New code sent. It works for 60 minutes.</span></div>
        )}
        <form onSubmit={submit} noValidate>
          <CodeBoxes value={code} onChange={setCode} invalid={Boolean(err)} autoFocus />
          <div className="er" id="c-err" style={{ justifyContent: "center", margin: "-6px 0 12px" }}>{err}</div>
          <BotCheck ref={bot} action="verify" />
          <button className="btn p" id="go" type="submit" disabled={busy}>
            {busy ? (<><Spin />Checking</>) : "Confirm my email"}
          </button>
        </form>
        <p className="hint" style={{ marginTop: 16 }}>
          Didn’t get it? Check your spam folder, or{" "}
          <button type="button" className="linkbtn" onClick={again} disabled={cd.left > 0 || !email}>
            {cd.left > 0 ? `Send a new code in ${cd.left}s` : "Send a new code"}
          </button>
        </p>
        <p className="hint">Wrong address? <Link href="/auth/sign-up">Change your email</Link></p>
        <p className="hint" style={{ marginTop: 10 }}>You can also select <b>Confirm my email</b> in the email we sent.</p>
      </div>
    </section>
  );
}
