"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Update 41: the invisible human check (Cloudflare Turnstile) on sign-up, log-in, password reset and the contact form.
 * Real people almost never see a puzzle; Cloudflare only shows one when it isn't sure. The token is checked on the server.
 * Shows nothing when the check is off (no key in Amplify, or the team turned it off in Safety rules).
 */

type TS = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TS;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;
function load() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((ok, bad) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => ok();
    s.onerror = () => {
      loading = null;
      bad(new Error("turnstile"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const Tick = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5L20 7" />
  </svg>
);

/** `round` changes after every submit, so a fresh token is ready for the next try (tokens work once). */
export function HumanCheck({ on, round = 0, onToken }: { on: boolean; round?: number; onToken: (t: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [ok, setOk] = useState(false);
  const [failed, setFailed] = useState(false);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!on) return;
    const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!key) return;
    let gone = false;
    load()
      .then(() => {
        if (gone || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: key,
          appearance: "interaction-only",
          action: "sme-hub",
          callback: (t: string) => {
            setOk(true);
            setFailed(false);
            cb.current(t);
          },
          "expired-callback": () => {
            setOk(false);
            cb.current("");
          },
          "error-callback": () => {
            setOk(false);
            setFailed(true);
            cb.current("");
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
      id.current = null;
    };
  }, [on]);

  useEffect(() => {
    if (!round || !id.current || !window.turnstile) return;
    setOk(false);
    cb.current("");
    window.turnstile.reset(id.current);
  }, [round]);

  if (!on || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;
  return (
    <div className="sfhuman">
      <div className={`sfts${ok ? " ok" : ""}`} aria-live="polite">
        {ok ? (
          <>
            <span className="sftk"><Tick /></span>You’re human. Thanks!
          </>
        ) : failed ? (
          <>Couldn’t run the human check. Refresh the page and try again.</>
        ) : (
          <>
            <span className="sfspin" aria-hidden="true" />Checking you’re human…
          </>
        )}
        <small>Protected by Cloudflare</small>
      </div>
      <div ref={box} className="sfcf" />
    </div>
  );
}
