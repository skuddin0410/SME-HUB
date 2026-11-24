import { cache } from "react";
import { createClient as createPlainClient } from "@supabase/supabase-js";

export type HelpTopic = { id: string; title: string; description: string; icon: string; position: number };
export type HelpArticle = { id: string; topic: string; title: string; summary: string; tags: string; popular: boolean; html: string; position: number; updated_on: string; body_text: string };
export type HelpKb = { topics: HelpTopic[]; articles: HelpArticle[] };
export type HelpHit = { id: string; title: string; summary: string; topic: string };

/** The Help Centre is public, so it reads with the plain public key and no sign-in cookies. */
function db() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Everything in the Help Centre (82 short articles), read once per request. No videos (Update 7). */
export const loadHelp = cache(async (): Promise<HelpKb> => {
  const s = db();
  const [t, a] = await Promise.all([s.from("help_topics").select("*").order("position"), s.from("help_articles").select("*").order("position")]);
  return { topics: (t.data ?? []) as HelpTopic[], articles: (a.data ?? []) as HelpArticle[] };
});

/** Article text keeps its original links (#/a/<id>, #/c/<id>) and picture paths (media/<file>); point them at the real pages. */
export function articleHtml(html: string) {
  return html
    .replace(/(src|data-zoom)="media\//g, '$1="/help-media/')
    .replace(/href="#\/[ac]\/([\w-]+)"/g, 'href="/help/$1"')
    .replace(/href="#hc-([\w-]+)"/g, 'href="/help/$1"');
}

export function terms(q: string) {
  return q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
}

/** The hand-off's ranking (hcSearch): title 6, tags and topic 3, summary 2, body 1; every word must appear; top 20. */
export function searchHelp(kb: HelpKb, q: string): HelpHit[] {
  const ts = terms(q);
  if (!ts.length) return [];
  const topicTitle = new Map(kb.topics.map((c) => [c.id, c.title]));
  return kb.articles
    .map((a) => {
      let sc = 0, all = true;
      const T = a.title.toLowerCase(), G = `${a.tags} ${topicTitle.get(a.topic) ?? ""}`.toLowerCase(), U = a.summary.toLowerCase(), X = (a.body_text ?? "").toLowerCase();
      for (const t of ts) {
        let h = 0;
        if (T.includes(t)) h += 6;
        if (G.includes(t)) h += 3;
        if (U.includes(t)) h += 2;
        if (X.includes(t)) h += 1;
        if (!h) all = false;
        sc += h;
      }
      return { a, s: all ? sc : 0 };
    })
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, 20)
    .map(({ a }) => ({ id: a.id, title: a.title, summary: a.summary, topic: topicTitle.get(a.topic) ?? "" }));
}

/** Topic icons in the zip's icon set (hcIc). */
const HCIM: Record<string, string> = { spark: "home", user: "edit", feed: "list", story: "play", group: "grid", ai: "spark", pen: "doc", compass: "pin" };
export const topicIcon = (n: string) => HCIM[n] ?? n;

/** Help home lists the team can edit (Update 8). Popular searches: short words, up to 12. Most asked: the team's choice, else the articles marked popular; 8 at most. */
export function helpHomeLists(kb: HelpKb, set: { chips?: unknown; popular?: unknown }) {
  const chips = (Array.isArray(set.chips) ? set.chips : [])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
  const byId = new Map(kb.articles.map((a) => [a.id, a]));
  const chosen = (Array.isArray(set.popular) ? set.popular : []).filter((id): id is string => typeof id === "string" && byId.has(id)).map((id) => byId.get(id)!);
  const list = (chosen.length ? chosen : kb.articles.filter((a) => a.popular)).slice(0, 8);
  return { chips, popular: list.map((a) => ({ id: a.id, title: a.title, summary: a.summary })) };
}
