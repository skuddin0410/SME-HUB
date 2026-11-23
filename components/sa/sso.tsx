"use client";

import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, LinkedInIcon } from "./fields";

type Provider = "google" | "linkedin_oidc";

/** Google and LinkedIn. Checks first that the provider is switched on in Supabase, and says so if it is not. */
export function Sso({ onNote }: { onNote: (text: string) => void }) {
  const start = async (provider: Provider, label: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
      });
      const settings = (await res.json()) as { external?: Record<string, boolean> };
      if (!settings.external?.[provider]) return onNote(`${label} sign-in is coming soon. Please use your email for now.`);
    } catch {
      return onNote("We could not reach the sign-in service. Try again in a moment.");
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/feed` },
    });
    if (error) onNote(`Could not start ${label} sign-in. Please use your email.`);
  };
  return (
    <div className="sso">
      <button type="button" className="btn g" onClick={() => start("google", "Google")}>
        <GoogleIcon />
        Google
      </button>
      <button type="button" className="btn g" onClick={() => start("linkedin_oidc", "LinkedIn")}>
        <LinkedInIcon />
        LinkedIn
      </button>
    </div>
  );
}
