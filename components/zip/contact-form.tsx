"use client";
import { useActionState } from "react";
import { sendContactMessage, type FormState } from "@/app/(hub)/actions";
import Link from "next/link";

export function ContactForm() {
  const [state, act, pending] = useActionState<FormState, FormData>(sendContactMessage, {});
  return (
    <form action={act} className="stack" style={{ gap: 10 }}>
      <label className="sr" htmlFor="cn">Your name</label>
      <input className="field" id="cn" name="name" placeholder="Your name" maxLength={120} required />
      <label className="sr" htmlFor="ce">Your email</label>
      <input className="field" id="ce" name="email" type="email" placeholder="Your email" maxLength={200} required />
      <label className="sr" htmlFor="cm">Your message</label>
      <textarea className="field" id="cm" name="message" placeholder="How can we help?" maxLength={4000} required />
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button type="submit" className="btn" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
        <span className="muted small">Looking for a quick answer? See <Link href="/help" style={{ textDecoration: "underline" }}>Help</Link>.</span>
      </div>
      <p className="small" role="status" aria-live="polite" style={{ color: state.error ? "#B42318" : "var(--link)" }}>
        {state.error ?? (state.ok ? "Thanks. Your message was sent and our team will reply by email." : "")}
      </p>
    </form>
  );
}
