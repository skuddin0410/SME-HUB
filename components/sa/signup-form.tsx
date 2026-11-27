"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signUp, type Fields } from "@/app/auth/actions";
import { passwordOk } from "@/lib/auth/password";
import { PROVINCES } from "@/lib/auth/provinces";
import { Err, PasswordField, Spin } from "./fields";
import { Sso } from "./sso";
import { HumanCheck } from "@/components/safety/human-check";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

export type Proof = { members: number; faces: string[] };

export function SignUpForm({ proof, human = false }: { proof: Proof; human?: boolean }) {
  const router = useRouter();
  // Update 41: the human check, a trap field people never see, and when the form opened
  const [token, setToken] = useState("");
  const [round, setRound] = useState(0);
  const [blocked, setBlocked] = useState("");
  const trap = useRef<HTMLInputElement>(null);
  const opened = useRef(0);
  useEffect(() => {
    opened.current = Date.now();
  }, []);
  const [v, setV] = useState({ fn: "", ln: "", bn: "", em: "", ws: "", pw: "", pr: "", tm: false, nl: false });
  const [errs, setErrs] = useState<Fields>({});
  const [exists, setExists] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errs[k]) setErrs((e) => ({ ...e, [k]: "" }));
    if (k === "em") setExists(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const em = v.em.trim();
    const bad: Fields = {};
    if (!v.fn.trim()) bad.fn = "Enter your first name.";
    if (!v.ln.trim()) bad.ln = "Enter your last name.";
    if (!v.bn.trim()) bad.bn = "Enter your business name.";
    if (!EMAIL.test(em)) bad.em = em ? "Check your email address. It should look like name@business.ca." : "Enter your email address.";
    if (!passwordOk(v.pw, em)) bad.pw = v.pw ? "Choose a stronger password. Follow the tips below." : "Create a password.";
    if (!v.pr) bad.pr = "Choose your province or territory.";
    if (!v.tm) bad.tm = "Please agree to the terms to continue.";
    setErrs(bad);
    setNote("");
    const first = Object.keys(bad)[0];
    if (first) return void form.current?.querySelector<HTMLElement>(`#${first}`)?.focus();

    setBusy(true);
    const res = await signUp({
      first: v.fn, last: v.ln, business: v.bn, email: em, website: v.ws, password: v.pw, province: v.pr, terms: v.tm, newsletter: v.nl,
      human: token, trap: trap.current?.value ?? "", elapsed: opened.current ? Date.now() - opened.current : 0,
    });
    if (res.ok) {
      try {
        sessionStorage.setItem("hub.email", em);
        sessionStorage.setItem("hub.first", v.fn.trim());
      } catch {}
      return router.push(`/auth/verify?email=${encodeURIComponent(em)}`);
    }
    setBusy(false);
    setRound((r) => r + 1);
    if (res.blocked) return setBlocked(res.blocked);
    setExists(Boolean(res.exists));
    setErrs(res.fields ?? {});
    if (res.form) setNote(res.form);
    const f = Object.keys(res.fields ?? {})[0];
    if (f) form.current?.querySelector<HTMLElement>(`#${f}`)?.focus();
  };

  return (
    <div className="split">
      <section className="brandp" aria-label="Why join SME Hub">
        <p className="eb">Free for Canadian small businesses</p>
        <h2>
          Get known by owners who can <span>send you work</span>.
        </h2>
        <ul>
          <li>
            <span className="chk"><Check /></span>
            <span>
              <b>Warm introductions</b>Meet customers and partners through people you both know.
            </span>
          </li>
          <li>
            <span className="chk"><Check /></span>
            <span>
              <b>Answers from owners like you</b>Ask about money, hiring, marketing or AI and get real replies.
            </span>
          </li>
          <li>
            <span className="chk"><Check /></span>
            <span>
              <b>A free business page</b>Get listed in the Canada-wide Business Directory.
            </span>
          </li>
        </ul>
        <p className="quote">
          “Two of my biggest clients this year came from introductions on SME Hub.”<small>Sara Haddad, Clearwater Bookkeeping, Ottawa</small>
        </p>
        <div className="faces">
          {proof.faces.length > 0 && (
            <span className="st">
              {proof.faces.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" />
              ))}
            </span>
          )}
          <span>
            {proof.members > 0 ? (
              <>
                <b>{proof.members.toLocaleString("en-CA")} owners</b> have joined. The first 500 keep a Founding Member badge.
              </>
            ) : (
              <>The first 500 members keep a Founding Member badge.</>
            )}
          </span>
        </div>
      </section>

      {blocked ? (
        <section className="card" aria-labelledby="h">
          <div>
            <p className="sfstep">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Can’t continue
            </p>
            <div className="sfbad">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z" /><path d="M12 10v4" /><path d="M12 17.5v.5" /></svg>
              <div>
                <h1 id="h">We couldn’t confirm you’re a person</h1>
                <p>{blocked}</p>
                <p>
                  If you keep seeing this, email <a href="mailto:support@smehub.ca">support@smehub.ca</a> and we’ll help.
                </p>
              </div>
            </div>
            <div className="sfjf">
              <button type="button" className="btn p" style={{ width: "auto" }} onClick={() => { opened.current = Date.now(); setBlocked(""); }}>
                Try again
              </button>
            </div>
          </div>
        </section>
      ) : (
      <section className="card" aria-labelledby="h">
        <div>
          <h1 id="h">Join SME Hub free</h1>
          <p className="sub">It takes about two minutes. No credit card.</p>
          <Sso onNote={setNote} />
          <div className="or">or sign up with email</div>
          <form ref={form} onSubmit={submit} noValidate>
            {note && (
              <div className="alert i" role="status">
                <span>{note}</span>
              </div>
            )}
            <div className="row2">
              <div className="f">
                <label className="l" htmlFor="fn">First name</label>
                <input className="t" id="fn" type="text" autoComplete="given-name" value={v.fn} onChange={(e) => set("fn", e.target.value)} aria-invalid={errs.fn ? "true" : "false"} aria-describedby="fn-err" maxLength={40} />
                <Err id="fn">{errs.fn}</Err>
              </div>
              <div className="f">
                <label className="l" htmlFor="ln">Last name</label>
                <input className="t" id="ln" type="text" autoComplete="family-name" value={v.ln} onChange={(e) => set("ln", e.target.value)} aria-invalid={errs.ln ? "true" : "false"} aria-describedby="ln-err" maxLength={40} />
                <Err id="ln">{errs.ln}</Err>
              </div>
            </div>
            <div className="f">
              <label className="l" htmlFor="bn">Business name</label>
              <input className="t" id="bn" type="text" autoComplete="organization" value={v.bn} onChange={(e) => set("bn", e.target.value)} aria-invalid={errs.bn ? "true" : "false"} aria-describedby="bn-err bn-h" maxLength={120} />
              <div className="hint" id="bn-h">Don’t have one yet? Write “Starting soon”.</div>
              <Err id="bn">{errs.bn}</Err>
            </div>
            <div className="f">
              <label className="l" htmlFor="em">Work email</label>
              <input className="t" id="em" type="email" autoComplete="email" placeholder="you@yourbusiness.ca" value={v.em} onChange={(e) => set("em", e.target.value)} aria-invalid={errs.em ? "true" : "false"} aria-describedby="em-err" />
              <Err id="em">
                {exists ? (
                  <span>
                    There’s already an account with this email. <Link href="/auth/login">Log in</Link> or <Link href="/auth/forgot-password">reset your password</Link>.
                  </span>
                ) : (
                  errs.em
                )}
              </Err>
            </div>
            <div className="f">
              <label className="l" htmlFor="ws">Business website or Google listing (optional)</label>
              <input className="t" id="ws" type="url" autoComplete="url" placeholder="yourbusiness.ca" value={v.ws} onChange={(e) => set("ws", e.target.value)} aria-invalid={errs.ws ? "true" : "false"} aria-describedby="ws-err ws-h" maxLength={200} />
              <div className="hint" id="ws-h">AI uses it to set up your profile and business page for you. You check everything before it’s saved.</div>
              <Err id="ws">{errs.ws}</Err>
            </div>
            <PasswordField id="pw" label="Create a password" value={v.pw} onChange={(x) => set("pw", x)} error={errs.pw} email={v.em} meter />
            <div className="f">
              <label className="l" htmlFor="pr">Province or territory</label>
              <select className="t" id="pr" value={v.pr} onChange={(e) => set("pr", e.target.value)} aria-invalid={errs.pr ? "true" : "false"} aria-describedby="pr-err">
                <option value="">Choose…</option>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <Err id="pr">{errs.pr}</Err>
            </div>
            <label className="cb">
              <input type="checkbox" id="tm" checked={v.tm} onChange={(e) => set("tm", e.target.checked)} aria-describedby="tm-err" />
              <span>
                I agree to the <Link href="/policies/terms" target="_blank">Terms</Link>, <Link href="/policies/privacy-policy" target="_blank">Privacy Policy</Link> and{" "}
                <Link href="/policies/community-guidelines" target="_blank">Community Guidelines</Link>.
              </span>
            </label>
            <div className="er" id="tm-err" style={{ margin: "-8px 0 12px" }}>{errs.tm}</div>
            <label className="cb">
              <input type="checkbox" id="nl" checked={v.nl} onChange={(e) => set("nl", e.target.checked)} />
              <span>Send me the free weekly CanadianSME newsletter with small-business news and events. You can unsubscribe anytime.</span>
            </label>
            <div className="sfhp" aria-hidden="true">
              <label>
                Leave this empty
                <input id="sfj-web" ref={trap} tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>
            <HumanCheck on={human} round={round} onToken={setToken} />
            <button className="btn p" type="submit" id="go" disabled={busy}>
              {busy ? (<><Spin />Creating your account</>) : "Create my free account"}
            </button>
          </form>
          <p className="foot">
            Already a member? <Link href="/auth/login">Log in</Link>
          </p>
        </div>
      </section>
      )}
    </div>
  );
}
