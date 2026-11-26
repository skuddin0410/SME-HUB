"use client";

import { useEffect } from "react";
import { startPresence } from "@/lib/presence-client";

/** Lets the hub know this member is online while a hub tab is open (for "Your network, live"). Renders nothing. */
export function Presence({ userId }: { userId: string | null }) {
  useEffect(() => { if (userId) startPresence(userId); }, [userId]);
  return null;
}
