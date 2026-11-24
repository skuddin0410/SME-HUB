"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applySpotlight } from "@/app/(hub)/ready-actions";
import { useReady } from "./provider";

/** The Spotlight application: three short questions and the required consent tick box. */
export function SpotlightForm() {
  const router = useRouter();
  const r = useReady();
  const [q, setQ] = useState({ q1: "", q2: "", q3: "", ok: false });
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const send = () => {
    setErr("");
    if (!q.q1.trim() || !q.q2.trim()) return r ? r.toast("Answer the first two questions") : setErr("Answer the first two questions");
    if (!q.ok) return r ? r.toast("Tick the box so CanadianSME can feature you") : setErr("Tick the box so CanadianSME can feature you");
    start(async () => {
      const res = await applySpotlight(q);
      if (res.error) return r ? r.toast(res.error) : setErr(res.error);
      r?.toast("Application sent");
      router.refresh();
    });
  };
  return (
    <div className="card pcspot">
      <h2>Tell the editors about your business</h2>
      <p className="muted small">Short answers are fine. Editors may contact you for more.</p>
      <label htmlFor="sp1">What does your business do, and who for?<textarea className="field" id="sp1" rows={3} maxLength={1500} value={q.q1} onChange={(e) => setQ({ ...q, q1: e.target.value })} /></label>
      <label htmlFor="sp2">One win or lesson other owners could learn from<textarea className="field" id="sp2" rows={3} maxLength={1500} value={q.q2} onChange={(e) => setQ({ ...q, q2: e.target.value })} /></label>
      <label htmlFor="sp3">What would you like readers to know or do?<textarea className="field" id="sp3" rows={2} maxLength={1500} value={q.q3} onChange={(e) => setQ({ ...q, q3: e.target.value })} /></label>
      <label className="pcsw"><input type="checkbox" id="sp-ok" checked={q.ok} onChange={(e) => setQ({ ...q, ok: e.target.checked })} /> CanadianSME can use my photo, business name and these answers in the magazine, newsletter and on social media.</label>
      {err && <p role="alert" className="small" style={{ color: "#B42318" }}>{err}</p>}
      <button type="button" className="btn" disabled={pending} onClick={send} style={{ alignSelf: "flex-start" }}>Apply for the Spotlight</button>
    </div>
  );
}
