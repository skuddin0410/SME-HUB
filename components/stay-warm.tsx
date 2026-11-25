"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const QUIET = 60_000; // after a minute away, wake things up on return
const EVERY = 4 * 60_000; // while the tab is open and visible, a tiny ping every 4 minutes

/**
 * Speed after a quiet spell. When a member comes back to the tab (or it has sat open for a while), this wakes the server
 * and renews the sign-in token in the background, before the member clicks anything. Without it the first click after
 * idling waited for the server to start and the token to renew. Renders nothing.
 */
export function StayWarm() {
  useEffect(() => {
    const supabase = createClient();
    let last = Date.now();
    let hiddenAt = 0;
    const wake = () => {
      last = Date.now();
      fetch("/api/warm", { cache: "no-store" }).catch(() => {});
      // renews an expired token now and saves it in the cookie, so the next page does not have to
      supabase.auth.getSession().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (Date.now() - hiddenAt > QUIET) wake();
    };
    const onFocus = () => { if (Date.now() - last > QUIET) wake(); };
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") wake(); }, EVERY);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", wake);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", wake);
    };
  }, []);
  return null;
}
