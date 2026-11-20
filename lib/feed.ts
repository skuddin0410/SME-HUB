type Rankable = { pinned_at: string | null; comments: number; counts: Partial<Record<string, number>> };

/** Engagement score: every reaction counts once, every reply twice. */
export function signalScore(p: Rankable) {
  return Object.values(p.counts).reduce<number>((a, n) => a + (n ?? 0), 0) + p.comments * 2;
}

/** Top Signal order: pinned posts first, then what members found most useful. Stable for ties. */
export function topSignal<T extends Rankable>(posts: T[]): T[] {
  return posts
    .map((p, i) => ({ p, i }))
    .sort((a, b) => Number(!!b.p.pinned_at) - Number(!!a.p.pinned_at) || signalScore(b.p) - signalScore(a.p) || a.i - b.i)
    .map(({ p }) => p);
}
