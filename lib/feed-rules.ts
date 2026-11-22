/** Limits that the database also enforces; the screens use them to guide people before they hit an error. */
export const FEED = {
  titleMax: 120,
  pollMin: 2,
  pollMax: 10,
  pollOptionMax: 80,
  editMinutes: 10,
  scheduleMaxDays: 90,
  pageSize: 10,
} as const;

/** Whether a post or comment is still inside the edit window. */
export function canEdit(createdAt: string, now = Date.now()) {
  return now - new Date(createdAt).getTime() <= FEED.editMinutes * 60_000;
}

/** Tidies poll options the way the database does: trimmed, blanks dropped. Returns null when the poll would be invalid. */
export function cleanPollOptions(options: string[]): string[] | null {
  const clean = options.map((o) => o.trim()).filter(Boolean);
  if (clean.length < FEED.pollMin || clean.length > FEED.pollMax) return null;
  if (clean.some((o) => o.length > FEED.pollOptionMax)) return null;
  return clean;
}

/** Share of the vote for each option, in whole percents that add up to 100 when anyone voted. */
export function pollShares(votes: number[]): number[] {
  const total = votes.reduce((a, b) => a + b, 0);
  if (total === 0) return votes.map(() => 0);
  const raw = votes.map((v) => (v / total) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (left-- <= 0) break;
    floor[i]++;
  }
  return floor;
}
