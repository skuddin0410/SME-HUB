/**
 * Update 10: short links and hashtag suggestions, as in the hand-off's post-box.js (cpShort, cpLinkify, cpSugTags).
 * Plain functions, used in the browser (post window, posts, comments) and on the server.
 */

export const URL_RX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;

/** Tracking bits hidden from the address a link opens (README: "Tracking bits like ?utm_source=… are hidden"). */
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|igshid)$/i;

/** "yealink.com/en/product-list/vi…": the domain plus the start of the path. */
export function shortLink(u: string): string {
  const x = u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[).,!?]+$/, "");
  const i = x.indexOf("/");
  if (i < 0) return x;
  const d = x.slice(0, i);
  const p = x.slice(i + 1).split(/[?#]/)[0];
  if (!p) return d;
  return `${d}/${p.length > 18 ? `${p.slice(0, 18)}…` : p}`;
}

/** The full address a short link opens, with https added and tracking parameters removed. */
export function linkHref(clean: string): string {
  const raw = /^https?:/i.test(clean) ? clean : `https://${clean}`;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    for (const k of [...url.searchParams.keys()]) if (TRACKING.test(k)) url.searchParams.delete(k);
    return url.toString();
  } catch {
    return "";
  }
}

export type TextPiece = { text: string; href?: string; short?: string };

/** Splits text into plain parts and links. Closing punctuation after a link stays outside it. */
export function splitLinks(text: string): TextPiece[] {
  const out: TextPiece[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RX)) {
    const u = m[0];
    const tail = (u.match(/[).,!?]+$/) ?? [""])[0];
    const clean = u.slice(0, u.length - tail.length);
    const href = linkHref(clean);
    const at = m.index ?? 0;
    if (!href) continue;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ text: clean, href, short: shortLink(clean) });
    last = at + clean.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

const STOP = new Set("about after again also another because been before being between both business businesses came come could does doing done each even every from have having here into just like made make many more most much must need only other over people really same should since some still such than that their them then there these they thing things think this those through very want were what when where which while will with would your yours year years founded since build builds building make makes helps help today week month company companies with".split(" "));
const SYN: Record<string, string[]> = {
  video: ["videoconferencing", "remotework"], conferencing: ["videoconferencing", "remotework"], headset: ["tech", "remotework"], headsets: ["tech", "remotework"],
  phone: ["telecom"], phones: ["telecom"], ai: ["ai", "smallbusinessai"], hiring: ["hiring", "jobs"], hire: ["hiring"], grant: ["grants", "funding"], grants: ["grants", "funding"],
  funding: ["funding"], cash: ["cashflow"], cashflow: ["cashflow"], marketing: ["marketing"], bakery: ["food", "localbusiness"], export: ["exporting"], exporting: ["exporting"],
  tax: ["tax"], ontario: ["ontario"], toronto: ["toronto"], canada: ["canadianbusiness"], canadian: ["canadianbusiness"], win: ["smallwins"], launch: ["launch"],
  software: ["software", "tech"], systems: ["tech"], retail: ["retail"], women: ["womeninbusiness"],
};

/**
 * Up to 6 hashtags for a post: from a keyword list, hashtags already used in the community and the strongest words in
 * the post. Hashtags already in the post are never suggested; `ok` applies the team's rules (length, blocked words).
 */
export function suggestTags(body: string, known: string[], ok: (tag: string) => boolean = () => true): string[] {
  const t = (body || "").toLowerCase();
  if (t.replace(/#\w+/g, "").trim().length < 12) return [];
  const have = new Set((t.match(/#(\w+)/g) ?? []).map((x) => x.slice(1)));
  const words = t.replace(URL_RX, " ").replace(/#\w+/g, " ").match(/[a-z][a-z0-9]{2,}/g) ?? [];
  const out: string[] = [];
  const add = (x: string) => {
    const c = x.replace(/[^a-z0-9]/g, "");
    if (c.length > 2 && !have.has(c) && !out.includes(c) && ok(c)) out.push(c);
  };
  words.forEach((w) => SYN[w]?.forEach(add));
  known.slice(0, 40).forEach((h) => { if (words.some((w) => w.length > 3 && (h === w || h === `${w}s` || w === `${h}s`))) add(h); });
  const freq: Record<string, number> = {};
  words.forEach((w) => { if (w.length > 5 && !STOP.has(w) && !/\d/.test(w)) freq[w] = (freq[w] ?? 0) + 1; });
  Object.keys(freq).sort((a, b) => freq[b] - freq[a] || b.length - a.length).slice(0, 3).forEach(add);
  add("smallbusiness");
  return out.slice(0, 6);
}
