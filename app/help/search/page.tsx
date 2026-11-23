import Link from "next/link";
import type { Metadata } from "next";
import { loadHelp, searchHelp } from "@/lib/help";
import { BigSearch, Crumbs, HRow, HelpCard } from "@/components/help/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q = "" } = await searchParams;
  return { title: { absolute: q.trim() ? `Search: ${q.trim()} | SME Hub Help Centre` : "SME Hub Help Centre" }, robots: { index: false, follow: true } };
}

export default async function HelpSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 120);
  const kb = await loadHelp();
  const r = q ? searchHelp(kb, q) : [];
  const topics = new Map(kb.topics.map((t) => [t.id, t]));
  return (
    <>
      <Crumbs items={[{ href: "/help", label: "Help Centre" }, { label: "Search" }]} />
      <BigSearch q={q} style={{ marginBottom: 18 }} />
      {q ? <h1 style={{ fontSize: 24 }} aria-live="polite">{r.length} result{r.length === 1 ? "" : "s"} for “{q}”</h1> : <h1 style={{ fontSize: 24 }}>Search the Help Centre</h1>}
      {r.length ? (
        <div className="card" style={{ padding: "8px 18px" }}><ul className="list">{r.map((a) => <HRow key={a.id} a={a} q={q} topics={topics} />)}</ul></div>
      ) : (
        <div className="card empty"><b>No articles match.</b><p>Try fewer or different words, or browse by topic.</p><Link className="btn" href="/help">Browse all topics</Link></div>
      )}
      <div style={{ marginTop: 18 }}><HelpCard /></div>
    </>
  );
}
