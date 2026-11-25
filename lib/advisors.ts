/** "Tue, Jan 19 · 10:00 am ET": how the handoff writes an advisor's call times (Toronto time). */
export function advWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day} · ${time} ET`;
}
export type AdvSlot = { id: string; at: string; minutes: number };
export type AdvReview = { id: string; name: string; avatar: string | null; role: string; rating: number; body: string };

/** "2026-12-09T12:00" typed in a date-and-time box, read as Toronto time (call times are shown in ET), to an ISO time. */
export function torontoIso(local: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(local);
  if (!m) return null;
  const guess = new Date(`${m[1]}T${m[2]}:00Z`);
  const there = new Date(guess.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() + (utc.getTime() - there.getTime())).toISOString();
}
