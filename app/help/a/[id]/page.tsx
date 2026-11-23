import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { articleHtml, formatUpdated, loadHelp } from "@/lib/help";
import { ArticleBody, Feedback } from "@/components/help/client";
import { Crumbs, HRow } from "@/components/help/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = (await loadHelp()).articles.find((x) => x.id === id);
  return { title: { absolute: a ? `${a.title} | SME Hub Help Centre` : "SME Hub Help Centre" }, description: a?.summary };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kb = await loadHelp();
  const a = kb.articles.find((x) => x.id === id);
  if (!a) notFound();
  const c = kb.topics.find((t) => t.id === a.topic)!;
  const list = kb.articles.filter((x) => x.topic === a.topic);
  const i = list.indexOf(a);
  const rel = list.filter((x) => x !== a).slice(Math.max(0, i - 1), Math.max(0, i - 1) + 3);
  return (
    <>
      <Crumbs items={[{ href: "/help", label: "Help Centre" }, { href: `/help/c/${c.id}`, label: c.title }, { label: a.title }]} />
      <div className="art">
        <aside className="card side" aria-label={c.title}>
          <h4>{c.title}</h4>
          {list.map((x) => <Link key={x.id} href={`/help/a/${x.id}`} aria-current={x === a ? "page" : undefined}>{x.title}</Link>)}
        </aside>
        <article className="card doc">
          <h1>{a.title}</h1>
          <p className="sum">{a.summary}</p>
          <div className="meta">Updated {formatUpdated(a.updated_on)}</div>
          <ArticleBody html={articleHtml(a.html)} />
          <Feedback id={a.id} />
          {rel.length ? <div className="related"><h3>Related articles</h3><ul className="list">{rel.map((x) => <HRow key={x.id} a={x} />)}</ul></div> : null}
        </article>
      </div>
    </>
  );
}
