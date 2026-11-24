"use client";

import { useState, useTransition } from "react";
import { subscribeBriefing } from "@/app/about-actions";

export function BriefingForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, start] = useTransition();
  const send = () => start(async () => {
    const r = await subscribeBriefing(email);
    setMsg(r.ok ? { ok: true, t: "Thanks! You’re on the list for the weekly Hub briefing." } : { ok: false, t: r.error ?? "Try again." });
    if (r.ok) setEmail("");
  });
  return (
    <form className="xabform" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label htmlFor="abmail" className="sr-only">Email address</label>
      <input id="abmail" type="email" placeholder="you@business.ca" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" className="btn" disabled={busy}>Subscribe free</button>
      {msg ? <small role="status" style={msg.ok ? undefined : { color: "#B42318" }}>{msg.t}</small> : <small>Free. Unsubscribe anytime.</small>}
    </form>
  );
}
