// Turns the Help Centre content file (smbhub-help-centre-articles.json) into SQL for supabase/seed/help_centre.sql.
// Usage: node scripts/build-help-seed.mjs path/to/smbhub-help-centre-articles.json > supabase/seed/help_centre.sql
// Article text keeps its original links (#/a/<id>) and picture paths (media/<file>); the site rewrites them when it draws a page.
import fs from "node:fs";
const kb = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const q = (s) => { if (String(s).includes("$h$")) throw new Error("unexpected $h$"); return `$h$${s}$h$`; };
const out = ["-- Help Centre content (topics, articles, video tours). Safe to run again.", "begin;"];
const updated = new Date(kb.updated + " 12:00 UTC").toISOString().slice(0, 10);
kb.cats.forEach((c, i) => out.push(`insert into help_topics (id, title, description, icon, position) values (${q(c.id)}, ${q(c.title)}, ${q(c.desc)}, ${q(c.icon)}, ${i}) on conflict (id) do update set title = excluded.title, description = excluded.description, icon = excluded.icon, position = excluded.position;`));
// articles that left the file are removed so old ones do not linger
out.push(`delete from help_articles where id <> all (array[${kb.articles.map((a) => q(a.id)).join(",")}]);`);
kb.articles.forEach((a, i) => out.push(`insert into help_articles (id, topic, title, summary, tags, popular, html, position, updated_on) values (${q(a.id)}, ${q(a.cat)}, ${q(a.title)}, ${q(a.summary)}, ${q(a.tags || "")}, ${a.popular ? "true" : "false"}, ${q(a.html)}, ${i}, '${updated}') on conflict (id) do update set topic = excluded.topic, title = excluded.title, summary = excluded.summary, tags = excluded.tags, popular = excluded.popular, html = excluded.html, position = excluded.position, updated_on = excluded.updated_on;`));
out.push("delete from help_videos;");
kb.vids.forEach((v, i) => out.push(`insert into help_videos (article_id, file, caption, title, position) values (${q(v.a)}, ${q(v.v)}, ${q(v.c)}, ${q(v.t)}, ${i});`));
out.push("commit;");
console.log(out.join("\n"));
