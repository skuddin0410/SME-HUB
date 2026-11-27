"use client";

import { useEffect } from "react";
import { startPresence } from "@/lib/presence-client";
import { createClient } from "@/lib/supabase/client";

/**
 * Lets the hub know this member is online while a hub tab is open (for "Your network, live"). Renders nothing.
 * Update 33: a member who turned off "Show when I am online" (Settings and privacy) isn't announced.
 */
export function Presence({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return;
    let off = false;
    createClient()
      .from("member_settings")
      .select("show_online")
      .eq("member_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!off && (data as { show_online?: boolean } | null)?.show_online !== false) startPresence(userId);
      });
    return () => {
      off = true;
    };
  }, [userId]);
  return null;
}
