import type { Defaults } from "@/lib/zip/settings";

export type TagSettings = Defaults["hashtags"];
export type TagRules = { per: number; min: number; max: number; blocked: string[]; removed: Record<string, boolean>; merge: Record<string, string> };

const RX = /#([A-Za-zÀ-ſ][A-Za-z0-9_À-ſ]*)/g;

export function tagRules(s: TagSettings): TagRules {
  return {
    per: Number(s.per) || 5, min: Number(s.min) || 3, max: Number(s.max) || 24,
    blocked: (s.blocked as string[]).map((b) => b.toLowerCase()), removed: s.removed as Record<string, boolean>, merge: s.merge as Record<string, string>,
  };
}

/** A hashtag after merges: "taxes" can be folded into "tax". */
export function canon(tag: string, merge: Record<string, string>) {
  let t = tag.toLowerCase();
  for (let n = 0; merge[t] && n < 5; n++) t = merge[t];
  return t;
}

/** Whether a word is allowed to be a hashtag under the team's rules. */
export function tagOk(tag: string, r: TagRules) {
  const c = canon(tag, r.merge);
  return tag.length >= r.min && tag.length <= r.max && !r.blocked.includes(c) && !r.removed[c];
}

/** The distinct hashtags in a piece of text, merged and limited to the most allowed in one post. */
export function extractTags(text: string, r: TagRules): string[] {
  const out: string[] = [];
  for (const m of (text ?? "").matchAll(RX)) {
    const c = canon(m[1], r.merge);
    if (tagOk(m[1], r) && !out.includes(c) && out.length < r.per) out.push(c);
  }
  return out;
}

export type Piece = { text: string; tag?: string };
/** Cuts text into plain pieces and hashtag pieces, so a screen can turn the tags into links. */
export function splitTags(text: string, r: TagRules): Piece[] {
  const pieces: Piece[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of text.matchAll(RX)) {
    const c = canon(m[1], r.merge);
    if (!tagOk(m[1], r)) continue;
    if (!seen.has(c)) { if (seen.size >= r.per) continue; seen.add(c); }
    const at = m.index ?? 0;
    if (at > last) pieces.push({ text: text.slice(last, at) });
    pieces.push({ text: m[0], tag: c });
    last = at + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}
