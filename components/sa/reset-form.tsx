"use client";

import Link from "next/link";
import { useState } from "react";
import { resetPassword, type Fields } from "@/app/auth/actions";
import { CheckIcon, ClockIcon, PasswordField, Spin } from "./fields";

export function ResetForm({ email }: { email: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [others, setOthers] = useState(true);
  const [errs, setErrs] = useState<Fields>({});
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"form" | "done" | "expired">("form");
  const [signedOut, setSignedOut] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrs({});
    setBusy(true);
    const res = await resetPassword({ password: pw, confirm: pw2, signOutOthers: others });
    setBusy(false);
    if (res.ok) {
      setSignedOut(res.others);
      return setState("done");
    }
    if (res.fields.form === "expired") return setState("expired");
    setErrs(res.fields);
    const f = Object.keys(res.fields)[0];
    if (f) document.getElementById(f === "form" ? "pw" : f)?.focus();
  };

  if (state === "done") {
    return (
      <section className="card">
        <div className="center">
          <div className="icon ok"><CheckIcon /></div>
          <h1>Password changed</h1>
          <p className="sub">Your new password is saved{signedOut ? " and you’ve been logged out everywhere else" : ""}. We’ve sent a confirmation to your email.</p>
          <Link className="btn p" href="/auth/login">Log in</Link>
        </div>
      </section>
    );
  }
  if (state === "expired") return <Expired />;

  return (
    <section className="card">
      <div>
        <h1 id="h">Choose a new password</h1>
        <p className="sub">For <span className="mail">{email}</span>. Use a password you don’t use anywhere else.</p>
        <form onSubmit={submit} noValidate>
          {errs.form && <div className="alert e" role="alert"><span>{errs.form}</span></div>}
          <PasswordField id="pw" label="New password" value={pw} onChange={(v) => { setPw(v); setErrs((x) => ({ ...x, pw: "" })); }} error={errs.pw} email={email} meter />
          <PasswordField id="pw2" label="Type it again" value={pw2} onChange={(v) => { setPw2(v); setErrs((x) => ({ ...x, pw2: "" })); }} error={errs.pw2} />
          <label className="cb">
            <input type="checkbox" id="so" checked={others} onChange={(e) => setOthers(e.target.checked)} />
            <span>Log me out on all other devices. Recommended if you think someone else knows your password.</span>
          </label>
          <button className="btn p" type="submit" id="go" disabled={busy}>
            {busy ? (<><Spin />Saving</>) : "Save new password"}
          </button>
        </form>
        <p className="foot"><Link href="/auth/login">Back to log in</Link></p>
      </div>
    </section>
  );
}

export function Expired() {
  return (
    <section className="card">
      <div className="center">
        <div className="icon w"><ClockIcon /></div>
        <h1>This link has expired</h1>
        <p className="sub">Password reset links work for 60 minutes and only once. Request a new link and use it straight away.</p>
        <Link className="btn p" href="/auth/forgot-password">Send me a new link</Link>
        <p className="foot"><Link href="/auth/login">Back to log in</Link></p>
      </div>
    </section>
  );
}
