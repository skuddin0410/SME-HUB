"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, LinkedInIcon, Spin } from "./fields";

type Provider = "google" | "linkedin_oidc";

/**
 * Google and LinkedIn. Checks first that the provider is switched on in Supabase, and says so if it is not.
 * While the browser goes to Google or LinkedIn, the chosen button shows "Opening …" and the rest of the
 * card dims, so the click is answered straight away.
 */
export function Sso({ onNote }: { onNote: (text: string) => void }) {
  const [going, setGoing] = useState<Provider | null>(null);

  // coming back with the browser's Back button: show the buttons ready again
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setGoing(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const start = async (provider: Provider, label: string) => {
    if (going) return;
    setGoing(provider);
    const fail = (text: string) => {
      setGoing(null);
      onNote(text);
    };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      });
      const settings = (await res.json()) as { external?: Record<string, boolean> };
      if (!settings.external?.[provider]) return fail(`${label} sign-in is coming soon. Please use your email for now.`);
    } catch {
      return fail("We could not reach the sign-in service. Try again in a moment.");
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/feed` },
    });
    if (error) fail(`Could not start ${label} sign-in. Please use your email.`);
    // on success the browser is now leaving for Google or LinkedIn; the button keeps saying so
  };

  const btn = (provider: Provider, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`btn g${going === provider ? " going" : ""}`}
      onClick={() => start(provider, label)}
      disabled={going !== null}
      aria-busy={going === provider}
    >
      {going === provider ? <Spin /> : icon}
      {going === provider ? `Opening ${label}…` : label}
    </button>
  );

  return (
    <div className={`sso${going ? " busy" : ""}`}>
      {btn("google", "Google", <GoogleIcon />)}
      {btn("linkedin_oidc", "LinkedIn", <LinkedInIcon />)}
    </div>
  );
}
