"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Security review (Nov 2026): Cloudflare Turnstile, the "are you a person?" check on every form that signs in,
 * signs up or sends an email. It only shows itself when Cloudflare is unsure; most people never see it.
 * It is switched on by setting NEXT_PUBLIC_TURNSTILE_SITE_KEY (a public key) in AWS Amplify. Supabase checks
 * the token with the secret key kept in its dashboard, so a script calling Supabase directly is refused too.
 * With no key set, the forms work exactly as before.
 */
export const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
export const BOT_CHECK_FAILED = "We couldn’t confirm you’re a person. Wait a moment and try again.";

type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
  getResponse: (id: string) => string | undefined;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loader: Promise<Turnstile> | null = null;
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
      s.onerror = () => {
        loader = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return loader;
}

export type BotCheckHandle = {
  /** The token for one request; waits up to 10 seconds for the check to finish. "" when there is no check. */
  token: () => Promise<string>;
  /** Tokens work once: call after every request so the next one gets a fresh token. */
  reset: () => void;
};

export const BotCheck = forwardRef<BotCheckHandle, { action?: string }>(function BotCheck({ action }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const current = useRef("");

  useEffect(() => {
    if (!TURNSTILE_KEY || !box.current) return;
    let gone = false;
    loadTurnstile()
      .then((t) => {
        if (gone || !box.current) return;
        widget.current = t.render(box.current, {
          sitekey: TURNSTILE_KEY,
          action,
          appearance: "interaction-only",
          size: "flexible",
          callback: (tok: string) => (current.current = tok),
          "expired-callback": () => (current.current = ""),
          "error-callback": () => {
            current.current = "";
          },
        });
      })
      .catch(() => {});
    return () => {
      gone = true;
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, [action]);

  useImperativeHandle(ref, () => ({
    token: async () => {
      if (!TURNSTILE_KEY) return "";
      for (let i = 0; i < 50 && !current.current; i++) await new Promise((r) => setTimeout(r, 200));
      return current.current;
    },
    reset: () => {
      current.current = "";
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
    },
  }));

  if (!TURNSTILE_KEY) return null;
  return <div ref={box} className="botcheck" style={{ margin: "8px 0" }} />;
});
