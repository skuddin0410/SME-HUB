import { createClient as createPlainClient } from "@supabase/supabase-js";

export type HelpTopic = { id: string; title: string; description: string; icon: string; position: number };
export type HelpArticle = { id: string; topic: string; title: string; summary: string; tags: string; popular: boolean; html: string; position: number; updated_on: string; body_text: string };
export type HelpVideo = { article_id: string; file: string; caption: string; title: string; position: number };
export type HelpKb = { topics: HelpTopic[]; articles: HelpArticle[]; videos: HelpVideo[] };

/** The Help Centre is public, so it reads with the plain public key and no sign-in cookies. */
function db() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Everything in the Help Centre (about 80 short articles), read once per request. */
export async function loadHelp(): Promise<HelpKb> {
  const s = db();
  const [t, a, v] = await Promise.all([
    s.from("help_topics").select("*").order("position"),
    s.from("help_articles").select("*").order("position"),
    s.from("help_videos").select("*").order("position"),
  ]);
  return { topics: (t.data ?? []) as HelpTopic[], articles: (a.data ?? []) as HelpArticle[], videos: (v.data ?? []) as HelpVideo[] };
}

/** Article text is stored with its original links (#/a/<id>) and picture paths (media/<file>); point them at the real pages. */
export function articleHtml(html: string) {
  return html
    .replace(/(src|poster|data-zoom)="media\//g, '$1="/help-media/')
    .replace(/href="#\/a\/([\w-]+)"/g, 'href="/help/a/$1"')
    .replace(/href="#\/c\/([\w-]+)"/g, 'href="/help/c/$1"');
}

export function terms(q: string) {
  return q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
}

/** Same ranking as the design: title 6, tags and topic 3, summary 2, body 1; every word must appear somewhere. */
export function searchHelp(kb: HelpKb, q: string): HelpArticle[] {
  const ts = terms(q);
  if (!ts.length) return [];
  const topicTitle = new Map(kb.topics.map((c) => [c.id, c.title]));
  return kb.articles
    .map((a) => {
      let sc = 0, all = true;
      const T = a.title.toLowerCase(), G = `${a.tags} ${topicTitle.get(a.topic) ?? ""}`.toLowerCase(), U = a.summary.toLowerCase(), X = a.body_text.toLowerCase();
      for (const t of ts) {
        let h = 0;
        if (T.includes(t)) h += 6;
        if (G.includes(t)) h += 3;
        if (U.includes(t)) h += 2;
        if (X.includes(t)) h += 1;
        if (!h) all = false;
        sc += h;
      }
      return { a, s: all ? sc : sc / 4 };
    })
    .filter((x) => x.s >= 1)
    .sort((x, y) => y.s - x.s)
    .map((x) => x.a);
}

/** A short piece of the article around the first search word, or its summary when the word is not in the text. */
export function snippetFor(a: HelpArticle, q: string): string {
  const tx = a.body_text.replace(/\s+/g, " ");
  const w = terms(q)[0] ?? "";
  const i = w ? tx.toLowerCase().indexOf(w) : -1;
  if (i < 0) return a.summary;
  const s = Math.max(0, i - 60);
  return `${s ? "…" : ""}${tx.slice(s, s + 170)}…`;
}

export const POPULAR_SEARCHES = ["Add my business", "Who viewed my profile", "Post an offer", "Stories", "Report a post", "Plans and prices", "Warm introduction"];

export function formatUpdated(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
