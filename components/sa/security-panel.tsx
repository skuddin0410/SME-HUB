"use client";

import Link from "next/link";
import { useState } from "react";
import { changePassword, endOtherSessions, endSession, setEmailCode, type Fields, type SessionRow } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, LinkedInIcon, LockIcon, PasswordField, Spin } from "./fields";
import "@/styles/auth-pages.css";

type Identity = { provider: string; email: string };

const MENU: [string, string][] = [
  ["Profile", "/profile/edit"],
  ["Privacy", "/settings"],
  ["Security and sign-in", "/settings/security"],
  ["Email notifications", "/settings"],
  ["Billing and plan", "/billing"],
  ["My data", "/settings"],
];

/** "Active now", "2 hours ago", "Nov 18": the last time a session was used. */
function ago(iso: string, current: boolean) {
  if (current) return "Active now";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Active now";
  if (mins < 60) return `${mins} minutes ago`;
  if (mins < 60 * 24) {
    const h = Math.round(mins / 60);
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

const Desktop = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
const Phone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 18h2" />
  </svg>
);

export function SecurityPanel({ email, sessions: first, identities, emailCode: codeOn, codeLive }: { email: string; sessions: SessionRow[]; identities: Identity[]; emailCode: boolean; codeLive: boolean }) {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [others, setOthers] = useState(true);
  const [errs, setErrs] = useState<Fields>({});
  const [ok, setOk] = useState<{ others: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState(first);
  const [allDone, setAllDone] = useState(false);
  const [code, setCode] = useState(codeOn);
  const [ids, setIds] = useState(identities);
  const [note, setNote] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setOk(null);
    setErrs({});
    setBusy(true);
    const res = await changePassword({ current: cur, password: pw, confirm: pw2, signOutOthers: others });
    setBusy(false);
    if (!res.ok) {
      setErrs(res.fields);
      const f = Object.keys(res.fields)[0];
      return void document.getElementById(f === "form" ? "cur" : f)?.focus();
    }
    setCur("");
    setPw("");
    setPw2("");
    setOk({ others: res.others });
    if (res.others) setSessions((s) => s.filter((x) => x.current));
  };

  const out = async (id: string) => {
    const r = await endSession(id);
    if (r.ok) setSessions((s) => s.filter((x) => x.id !== id));
  };

  const hasGoogle = ids.find((i) => i.provider === "google");
  const hasLinkedIn = ids.find((i) => i.provider === "linkedin_oidc");

  const link = async (provider: "google" | "linkedin_oidc", label: string) => {
    setNote("");
    const { error } = await createClient().auth.linkIdentity({ provider, options: { redirectTo: `${window.location.origin}/auth/callback?next=/settings/security` } });
    if (error) setNote(`${label} can’t be connected right now. ${/disabled|not enabled|manual/i.test(error.message) ? "It isn’t switched on yet." : "Try again in a moment."}`);
  };
  const unlink = async (provider: string, label: string) => {
    setNote("");
    const supabase = createClient();
    const { data } = await supabase.auth.getUserIdentities();
    const target = data?.identities.find((i) => i.provider === provider);
    if (!target) return;
    if ((data?.identities.length ?? 0) < 2) return setNote(`${label} is the only way you log in, so it can’t be disconnected. Add a password first.`);
    const { error } = await supabase.auth.unlinkIdentity(target);
    if (error) setNote(`We could not disconnect ${label}. Try again in a moment.`);
    else setIds((l) => l.filter((i) => i.provider !== provider));
  };

  return (
    <div className="sa" style={{ minHeight: 0, background: "transparent", display: "block" }}>
      <div className="acct">
        <nav className="amenu" aria-label="Account settings">
          {MENU.map(([label, href]) => (
            <Link key={label} href={href} aria-current={href === "/settings/security" ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="apanel">
          <section className="box" aria-labelledby="h">
            <h2 id="h">Change your password</h2>
            <p className="sub">You’ll stay logged in on this device. We’ll email you to confirm the change.</p>
            <div id="msg" aria-live="polite">
              {ok && (
                <div className="alert s" role="status">
                  <span>
                    <b>Password updated.</b>
                    {ok.others ? "You’ve been logged out on your other devices. " : ""}We’ve sent a confirmation to {email}.
                  </span>
                </div>
              )}
              {errs.form && (
                <div className="alert e" role="alert">
                  <span>{errs.form}</span>
                </div>
              )}
            </div>
            <form onSubmit={submit} noValidate>
              <PasswordField id="cur" label="Current password" labelExtra={<Link href="/auth/forgot-password">Forgot it?</Link>} value={cur} onChange={(v) => { setCur(v); setErrs((x) => ({ ...x, cur: "" })); }} error={errs.cur} autoComplete="current-password" />
              <PasswordField id="pw" label="New password" value={pw} onChange={(v) => { setPw(v); setErrs((x) => ({ ...x, pw: "" })); }} error={errs.pw} email={email} meter />
              <PasswordField id="pw2" label="Type the new password again" value={pw2} onChange={(v) => { setPw2(v); setErrs((x) => ({ ...x, pw2: "" })); }} error={errs.pw2} />
              <label className="cb">
                <input type="checkbox" id="so" checked={others} onChange={(e) => setOthers(e.target.checked)} />
                <span>Log me out on all other devices</span>
              </label>
              <button className="btn p" type="submit" id="go" disabled={busy} style={{ width: "auto", padding: "0 26px" }}>
                {busy ? (<><Spin />Updating</>) : "Update password"}
              </button>
            </form>
          </section>

          <section className="box" aria-labelledby="h2">
            <h2 id="h2">Where you’re logged in</h2>
            <p className="sub">Log out of any device you don’t recognise, then change your password.</p>
            {sessions.map((s) => (
              <div className="sess" key={s.id}>
                <span className="ic">{/iPhone|Android|iOS/.test(s.device) ? <Phone /> : <Desktop />}</span>
                <div className="m">
                  <b>
                    {s.device} {s.current && <span className="tagok">This device</span>}
                  </b>
                  <span>
                    {s.where} · {ago(s.lastSeen, s.current)}
                  </span>
                </div>
                {!s.current && (
                  <button className="btn g sm" type="button" onClick={() => out(s.id)}>
                    Log out
                  </button>
                )}
              </div>
            ))}
            <p style={{ margin: "14px 0 0" }}>
              <button
                className="btn g sm"
                type="button"
                disabled={allDone || sessions.every((s) => s.current)}
                onClick={async () => {
                  const r = await endOtherSessions();
                  if (r.ok) {
                    setSessions((s) => s.filter((x) => x.current));
                    setAllDone(true);
                  }
                }}
              >
                {allDone ? "Logged out of all other devices" : "Log out of all other devices"}
              </button>
            </p>
          </section>

          <section className="box" aria-labelledby="h3">
            <h2 id="h3">Sign-in methods</h2>
            {note && (
              <div className="alert i" role="status">
                <span>{note}</span>
              </div>
            )}
            <div className="sess">
              <span className="ic"><GoogleIcon /></span>
              <div className="m">
                <b>Google</b>
                <span>{hasGoogle ? `${hasGoogle.email || email} · Connected` : "Not connected"}</span>
              </div>
              <button className="btn g sm" type="button" onClick={() => (hasGoogle ? unlink("google", "Google") : link("google", "Google"))}>
                {hasGoogle ? "Disconnect" : "Connect"}
              </button>
            </div>
            <div className="sess">
              <span className="ic"><LinkedInIcon /></span>
              <div className="m">
                <b>LinkedIn</b>
                <span>{hasLinkedIn ? `${hasLinkedIn.email || email} · Connected` : "Not connected"}</span>
              </div>
              <button className="btn g sm" type="button" onClick={() => (hasLinkedIn ? unlink("linkedin_oidc", "LinkedIn") : link("linkedin_oidc", "LinkedIn"))}>
                {hasLinkedIn ? "Disconnect" : "Connect"}
              </button>
            </div>
            <div className="sess">
              <span className="ic"><LockIcon /></span>
              <div className="m">
                <b>Email code on new devices</b>
                <span>{code ? (codeLive ? "On. We email a 6-digit code when you log in from a new device." : "On. Email sending isn’t switched on yet, so no code is asked for at the moment.") : "Off. We won’t ask for an email code on new devices."}</span>
              </div>
              {code && <span className="tagok">On</span>}
              <button
                className="btn g sm"
                type="button"
                onClick={async () => {
                  const next = !code;
                  const r = await setEmailCode(next);
                  if (r.ok) setCode(next);
                }}
              >
                {code ? "Turn off" : "Turn on"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
