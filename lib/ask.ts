/** Ask the Hub: what one answer holds (shared by the server and the page). */
export type AskSource = {
  posts: { id: string; author: { id: string; name: string; avatar: string | null; role: string }; text: string; about: string }[];
  members: { id: string; name: string; avatar: string | null; helps: string }[];
  biz: { slug: string; name: string; city: string }[];
};
export type Ask = { id: string; q: string; answer: string; sources: AskSource; created_at: string };
export const ASK_SUGGESTIONS = ["How do I get new customers without ads?", "Who can help with a commercial lease?", "Advice on landing a wholesale account", "Bookkeeping check before tax season"];

const STOP = new Set(["help", "with", "have", "from", "that", "this", "what", "your", "anyone", "tips", "first", "before", "does", "need", "looking", "would", "they", "them", "there", "about", "into", "their", "some", "when", "which", "will", "just", "been", "were", "more", "than", "after", "business", "businesses", "small", "owner", "owners", "best", "good", "should", "could", "where", "find", "make", "getting", "start", "how", "who", "can", "the", "and", "for", "advice"]);

/** The question's meaningful words as an "any of these" search (word stems, so "pricing" finds "price"). */
export function askQuery(q: string): string {
  const words = (q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.slice(0, 5));
  return [...new Set(words)].slice(0, 8).map((w) => `${w}:*`).join(" | ");
}
