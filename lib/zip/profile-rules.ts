import type { Defaults } from "@/lib/zip/settings";

export type ProfileRules = Defaults["profiles"];

/** How a member's name appears across the Hub ("First and last", "First name only"). A nickname falls back to the first name until members can set one. */
export function displayName(name: string | null | undefined, mode: string): string {
  const full = (name ?? "").trim();
  if (!full) return "Member";
  return mode === "first" || mode === "nick" ? full.split(/\s+/)[0] : full;
}

/** The profile's connect, message and follow buttons in the order and on/off state the team chose. */
export function profileActions(rules: ProfileRules): string[] {
  return (rules.actions as [string, boolean][])
    .filter(([k, on]) => on && !(k === "connect" && !rules.connect) && !(k === "follow" && !rules.follow))
    .map(([k]) => k);
}

/** Whether this member may close their own account, from "Closing an account" on Profile settings. */
export function mayCloseAccount(rules: ProfileRules, plan: string | null | undefined): boolean {
  if (rules.del === "all") return true;
  if (rules.del === "team") return false;
  return !plan || plan === "free";
}
