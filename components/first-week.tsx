"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type WeekStep = { key: string; title: string; text: string; cta: string; href: string; done: boolean; soon?: boolean };

const KEY = "smbhub.firstweek.hidden";

/** "Your first week": a short checklist for new members. Steps tick themselves from real activity. */
export function FirstWeek({ steps, connections = 0 }: { steps: WeekStep[]; connections?: number }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const done = steps.filter((s) => s.done).length;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  if (hidden || done === steps.length) return null;

  return (
    <section className="card gs4" aria-labelledby="first-week-title">
      <div className="row" style={{ flexWrap: "wrap" }}>
        <div className="stack grow" style={{ gap: 2, flexBasis: 240 }}>
          <p className="eyebrow">Your first week</p>
          <h2 id="first-week-title" style={{ font: "800 19px var(--display)" }}>Get started on SMB Hub</h2>
        </div>
        <span className="muted small">{done} of {steps.length} done</span>
        <button type="button" className="linkbtn muted small" onClick={hide} aria-label="Hide this checklist">✕</button>
      </div>
      <div className="bar" role="img" aria-label={`${done} of ${steps.length} steps done`}><i style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <div className="gsgrid">
        <ol className="gslist">
          {steps.map((s) => (
            <li key={s.key} className={s.done ? "done" : ""}>
              <span className="gsck" aria-hidden="true">{s.done ? "✓" : ""}</span>
              <span className="stack grow" style={{ gap: 1, minWidth: 0 }}>
                <strong>{s.title}</strong>
                <span className="muted small">{s.text}</span>
              </span>
              {s.done ? (
                <span className="sr">Done</span>
              ) : s.soon ? (
                <span className="btn sm ghost" aria-disabled="true" style={{ opacity: 0.6, cursor: "default" }}>Coming soon</span>
              ) : (
                <Link href={s.href} className="btn sm ghost">{s.cta}</Link>
              )}
            </li>
          ))}
        </ol>
        <div className="gsval">
          <span className="eyebrow">Value, not vanity</span>
          <span className="gsnum"><span className="n">?</span><span className="small">Potential customers</span></span>
          <Link className="gsnum" href="/network/connections"><span className="n">{connections}</span><span className="small">Connections</span></Link>
          <span className="muted small">Say who you want to meet and we count your potential customers.</span>
        </div>
      </div>
    </section>
  );
}
