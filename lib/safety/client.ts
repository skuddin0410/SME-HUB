/**
 * Update 41: the database stops a member with a message that starts "safety: ". Two shapes:
 *   "safety: <title>|<text>|week"  a welcome-week or daily limit: shown in the "This unlocks soon" window
 *   "safety: <sentence>"           anything else (a protected name, a suspended account): shown as plain text
 */
export const SAFETY_EVENT = "hub:safety";
export type SafetyStop = { title: string; text: string; week: boolean };

export function parseSafety(msg: unknown): SafetyStop | null {
  const m = typeof msg === "string" ? msg : msg instanceof Error ? msg.message : "";
  const i = m.indexOf("safety: ");
  if (i < 0) return null;
  const [title = "", text = "", week = ""] = m.slice(i + 8).trim().split("|");
  return { title, text, week: week === "week" };
}

/** The plain words, without the marker: "Links unlock after your welcome week. Take the link out…" */
export function safetyPlain(msg: unknown): string | null {
  const s = parseSafety(msg);
  if (!s) return null;
  if (!s.text) return s.title;
  return `${s.title.replace(/[.!]$/, "")}. ${s.text}`;
}

/** Opens the window for a limit; plain safety messages fall through (returns false) so the caller shows them. */
export function showSafety(msg: unknown): boolean {
  const s = parseSafety(msg);
  if (!s || !s.text) return false;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<SafetyStop>(SAFETY_EVENT, { detail: s }));
  return true;
}
