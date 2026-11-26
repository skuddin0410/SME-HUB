"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Who is online in the hub right now, using Supabase Realtime Presence (nothing is stored in the database).
 * Each signed-in tab joins one shared channel and announces its member id; pages that want to know who is online
 * listen through `onOnline`. One channel per tab, shared by every listener.
 */
let channel: RealtimeChannel | null = null;
let online = new Set<string>();
const listeners = new Set<(ids: Set<string>) => void>();

export function startPresence(userId: string) {
  if (channel) return;
  const supabase = createClient();
  channel = supabase.channel("hub-online", { config: { presence: { key: userId } } });
  channel
    .on("presence", { event: "sync" }, () => {
      online = new Set(Object.keys(channel?.presenceState() ?? {}));
      listeners.forEach((fn) => fn(online));
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") channel?.track({ at: Date.now() }).catch(() => {});
    });
}

/** Calls `fn` with the ids online now, and again whenever that changes. Returns a function that stops listening. */
export function onOnline(fn: (ids: Set<string>) => void) {
  listeners.add(fn);
  fn(online);
  return () => { listeners.delete(fn); };
}
