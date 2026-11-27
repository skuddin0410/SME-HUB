"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { finishProfile, type Fields } from "@/app/auth/actions";
import { PROVINCES } from "@/lib/auth/provinces";
import { Err, Spin } from "./fields";

/** Google and LinkedIn members: the sign-up form's details, minus email and password, asked once. */
export function FinishForm({ next, via, email, initial }: { next: string; via: string; email: string; initial: { fn: string; ln: string; ws: string } }) {
  const router = useRouter();
  const [v, setV] = useState({ fn: initial.fn, ln: initial.ln, bn: "", ws: initial.ws, pr: "", tm: false, nl: false });
  const [errs, setErrs] = useState<Fields>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errs[k]) setErrs((e) => ({ ...e, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const bad: Fields = {};
    if (!v.fn.trim()) bad.fn = "Enter your first name.";
    if (!v.ln.trim()) bad.ln = "Enter your last name.";
    if (!v.bn.trim()) bad.bn = "Enter your business name.";
    if (!v.pr) bad.pr = "Choose your province or territory.";
    if (!v.tm) bad.tm = "Please agree to the terms to continue.";
    setErrs(bad);
    setNote("");
    const first = Object.keys(bad)[0];
    if (first) return void form.current?.querySelector<HTMLElement>(`#${first}`)?.focus();

    setBusy(true);
    const res = await finishProfile({ first: v.fn, last: v.ln, business: v.bn, website: v.ws, province: v.pr, terms: v.tm, newsletter: v.nl });
    if (res.ok) {
      router.replace(`/auth/welcome?joined=1&next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(false);
    setErrs(res.fields ?? {});
    if (res.form) setNote(res.form);
    const f = Object.keys(res.fields ?? {})[0];
    if (f) form.current?.querySelector<HTMLElement>(`#${f}`)?.focus();
  };

  return (
    <section className="card" aria-labelledby="h" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div>
        <h1 id="h">Finish your profile</h1>
        <p className="sub">
          You’re signed in with {via} as <b>{email}</b>. A few details so other owners know who you are.
        </p>
        <form ref={form} onSubmit={submit} noValidate>
          {note && (
            <div className="alert e" role="alert">
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
            <input className="t" id="bn" type="text" autoComplete="organization" value={v.bn} onChange={(e) => set("bn", e.target.value)} aria-invalid={errs.bn ? "true" : "false"} aria-describedby="bn-err bn-h" maxLength={120} autoFocus />
            <div className="hint" id="bn-h">Don’t have one yet? Write “Starting soon”.</div>
            <Err id="bn">{errs.bn}</Err>
          </div>
          <div className="f">
            <label className="l" htmlFor="ws">Business website or Google listing (optional)</label>
            <input className="t" id="ws" type="url" autoComplete="url" placeholder="yourbusiness.ca" value={v.ws} onChange={(e) => set("ws", e.target.value)} aria-invalid={errs.ws ? "true" : "false"} aria-describedby="ws-err" maxLength={200} />
            <Err id="ws">{errs.ws}</Err>
          </div>
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
          <button className="btn p" type="submit" id="go" disabled={busy}>
            {busy ? (<><Spin />Saving</>) : "Continue to SME Hub"}
          </button>
        </form>
      </div>
    </section>
  );
}
