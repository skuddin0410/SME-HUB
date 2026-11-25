"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPassword } from "@/app/auth/actions";
import { Err, LockIcon, MailIcon, Spin, useCountdown } from "./fields";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const cd = useCountdown();

  const send = async (to: string) => {
    const res = await forgotPassword(to);
    if (!res.ok) {
      setErr(res.error);
      setNote(res.error);
      return false;
    }
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const em = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
      setErr(em ? "Check your email address." : "Enter your email address.");
      return void document.getElementById("em")?.focus();
    }
    setErr("");
    setBusy(true);
    const ok = await send(em);
    setBusy(false);
    if (ok) {
      setSent(em);
      cd.start(30);
    }
  };

  if (sent) {
    return (
      <section className="card">
        <div className="center">
          <div className="icon"><MailIcon /></div>
          <h1 tabIndex={-1}>Check your email</h1>
          <p className="sub">
            If there’s an SME Hub account for <span className="mail">{sent}</span>, we’ve sent a link to reset your password. It works for 60 minutes.
          </p>
          <div className="alert i" style={{ textAlign: "left" }}>
            <span>
              <b>Don’t see it?</b>Check spam and promotions. The email comes from support@smehub.ca with the subject “Reset your SME Hub password”.
            </span>
          </div>
          {note && <div className="alert w" role="status" style={{ textAlign: "left" }}><span>{note}</span></div>}
          <button
            type="button"
            className="btn g"
            style={{ width: "100%" }}
            disabled={cd.left > 0}
            onClick={async () => {
              setNote("");
              cd.start(30);
              await send(sent);
            }}
          >
            {cd.left > 0 ? `Send the link again in ${cd.left}s` : "Send the link again"}
          </button>
          <p className="foot">
            <Link href="/auth/login">Back to log in</Link> · <a href="/auth/forgot-password">Use a different email</a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div>
        <div className="icon r"><LockIcon /></div>
        <h1 id="h">Forgot your password?</h1>
        <p className="sub">Enter the email you use for SME Hub and we’ll send you a link to choose a new password.</p>
        <form onSubmit={submit} noValidate>
          <div className="f">
            <label className="l" htmlFor="em">Email</label>
            <input className="t" id="em" type="email" autoComplete="email" placeholder="you@yourbusiness.ca" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} aria-invalid={err ? "true" : "false"} aria-describedby="em-err" />
            <Err id="em">{err}</Err>
          </div>
          <button className="btn p" type="submit" id="go" disabled={busy}>
            {busy ? (<><Spin />Sending</>) : "Send reset link"}
          </button>
        </form>
        <p className="foot"><Link href="/auth/login">Back to log in</Link></p>
      </div>
    </section>
  );
}
