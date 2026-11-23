import Link from "next/link";
import { loadHelp, POPULAR_SEARCHES } from "@/lib/help";
import { HIcon } from "@/components/help/icons";
import { BigSearch, HRow, HelpCard } from "@/components/help/parts";

export const dynamic = "force-dynamic";

export default async function HelpHome() {
  const kb = await loadHelp();
  const count = (id: string) => kb.articles.filter((a) => a.topic === id).length;
  const pop = kb.articles.filter((a) => a.popular).slice(0, 10);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">SME Hub Help Centre</p>
        <h1>How can we <span className="hl">help?</span></h1>
        <p className="lead">Guides and answers for every part of SME Hub, from your first post to running your business page.</p>
        <BigSearch placeholder="Search, for example “add my business” or “offers”" />
        <div className="chips" aria-label="Popular searches">
          {POPULAR_SEARCHES.map((t) => <Link key={t} className="chip" href={`/help/search?q=${encodeURIComponent(t)}`}>{t}</Link>)}
        </div>
      </section>
      <h2>Browse by topic</h2>
      <div className="cats">
        {kb.topics.map((c) => {
          const n = count(c.id);
          return (
            <Link key={c.id} className="cat" href={`/help/c/${c.id}`}>
              <span className="ico"><HIcon n={c.icon} /></span>
              <span><b>{c.title}</b><span>{c.description}</span><small>{n} article{n === 1 ? "" : "s"}</small></span>
            </Link>
          );
        })}
      </div>
      <h2>Quick video tours</h2>
      <div className="tours">
        {kb.videos.slice(0, 8).map((v) => (
          <Link key={v.article_id} className="tour" href={`/help/a/${v.article_id}`}>
            <span className="th" style={{ backgroundImage: `url(/help-media/${v.file}.jpg)` }} />
            <b>{v.title}</b><span>{v.caption}</span>
          </Link>
        ))}
      </div>
      <h2>Popular articles</h2>
      <div className="grid2">
        <div className="card" style={{ padding: "8px 18px" }}><ul className="list">{pop.map((a) => <HRow key={a.id} a={a} />)}</ul></div>
        <HelpCard />
      </div>
    </>
  );
}
