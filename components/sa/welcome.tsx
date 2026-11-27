"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Who } from "@/lib/auth/who";
import { cityFor } from "./canada-map";

/** "Welcome back, Syed" with the member's photo (or initial), shown for a moment after logging in. */
export function WelcomeCard({ who, joined }: { who: Who | null; joined?: boolean }) {
  const initial = (who?.first || "").slice(0, 1).toUpperCase();
  const hello = joined ? "Welcome to SME Hub" : "Welcome back";
  return (
    <section className="sawel" role="status" aria-live="polite">
      {who?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ava" src={who.avatar} alt="" width={84} height={84} />
      ) : (
        <span className="ava" aria-hidden="true">
          {initial || (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          )}
        </span>
      )}
      <h1>{who?.first ? `${hello}, ${who.first}` : hello}</h1>
      <p className="sub">Taking you to your Home page…</p>
    </section>
  );
}

/** Pulses the member's city on the map (CanadaHorizon listens for this). */
export function pulseCity(who: Who | null) {
  window.dispatchEvent(new CustomEvent("sa:welcome", { detail: { city: cityFor(who?.location) } }));
}

/**
 * The welcome moment after Google or LinkedIn (they return through /auth/callback, not the log-in form):
 * the map comes in, rings pulse from the member's city, then the Home page opens. Reduced motion: straight on.
 */
export function WelcomeGo({ who, next, joined }: { who: Who | null; next: string; joined?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    router.prefetch(next);
    const go = () => router.replace(next);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
    const a = window.setTimeout(() => pulseCity(who), 700);
    const b = window.setTimeout(go, 2400);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [router, next, who]);
  return <WelcomeCard who={who} joined={joined} />;
}
