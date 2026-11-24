import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { articleHtml, loadHelp, topicIcon, type HelpKb } from "@/lib/help";
import { HcBody, HcContact, HcFeedback, HcList, HcSearchBox, HcSearchLink } from "@/components/help/hub";
import { Ic } from "@/components/zip/ic";
import "@/styles/help.css";
import "@/styles/help-extra.css";

export const dynamic = "force-dynamic";

/** /help/<topic-id> or /help/<article-id> (the two sets of ids never overlap). */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const kb = await loadHelp();
  const a = kb.articles.find((x) => x.id === id);
  const c = kb.topics.find((x) => x.id === id);
  if (a) return { title: { absolute: `${a.title} | SME Hub Help` }, description: a.summary, alternates: { canonical: `/help/${a.id}` }, openGraph: { title: a.title, description: a.summary, url: `/help/${a.id}`, type: "article" } };
  if (c) return { title: { absolute: `${c.title} | SME Hub Help` }, description: c.description, alternates: { canonical: `/help/${c.id}` } };
  return { title: { absolute: "Help Centre | SME Hub" } };
}

function Crumb({ c, a }: { c: { id: string; title: string }; a?: { title: string } }) {
  return (
    <nav className="hccrumb small" aria-label="Breadcrumb">
      <Link href="/help">Help Centre</Link> <span aria-hidden="true">›</span>{" "}
      {a ? <><Link href={`/help/${c.id}`}>{c.title}</Link> <span aria-hidden="true">›</span> <span>{a.title}</span></> : <span>{c.title}</span>}
    </nav>
  );
}

function Side({ kb, cur, curA }: { kb: HelpKb; cur: string; curA?: string }) {
  return (
    <aside className="hcside">
      <div className="card hcnav">
        <HcSearchBox />
        <nav aria-label="Help topics">
          <ul>
            {kb.topics.map((c) => {
              const on = c.id === cur;
              return (
                <li key={c.id}>
                  <Link href={`/help/${c.id}`} aria-current={on ? (curA ? "true" : "page") : undefined}><Ic n={topicIcon(c.icon)} s={16} /><span>{c.title}</span></Link>
                  {on && curA && (
                    <ul className="hcsub">
                      {kb.articles.filter((a) => a.topic === c.id).map((a) => (
                        <li key={a.id}><Link href={`/help/${a.id}`} aria-current={a.id === curA ? "page" : undefined}>{a.title}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

export default async function HelpItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kb = await loadHelp();
  const c = kb.topics.find((x) => x.id === id);
  const a = kb.articles.find((x) => x.id === id);
  if (!c && !a) notFound();
  let body: React.ReactNode;
  if (c) {
    const L = kb.articles.filter((x) => x.topic === c.id);
    body = (
      <div className="hcwrap">
        <Side kb={kb} cur={c.id} />
        <main className="hcmain">
          <Crumb c={c} />
          <div className="hctop">
            <span className="sq big"><Ic n={topicIcon(c.icon)} s={20} /></span>
            <div className="stack" style={{ gap: 4 }}><h1>{c.title}</h1><p className="muted">{c.description}</p></div>
          </div>
          <HcSearchLink />
          <HcList items={L.map((x) => ({ id: x.id, title: x.title, summary: x.summary, topic: c.title }))} />
          <HcContact />
        </main>
      </div>
    );
  } else {
    const t = kb.topics.find((x) => x.id === a!.topic)!;
    const L = kb.articles.filter((x) => x.topic === t.id);
    const i = L.findIndex((x) => x.id === a!.id);
    const prev = L[i - 1], next = L[i + 1];
    body = (
      <div className="hcwrap">
        <Side kb={kb} cur={t.id} curA={a!.id} />
        <main className="hcmain">
          <article className="card hcart">
            <Crumb c={t} a={a!} />
            <h1>{a!.title}</h1>
            <p className="hcsum">{a!.summary}</p>
            <HcBody html={articleHtml(a!.html)} />
            <HcFeedback id={a!.id} />
            <nav className="hcpn" aria-label="More in this topic">
              {prev ? <Link href={`/help/${prev.id}`}><span className="small muted">Previous</span><b>{prev.title}</b></Link> : <span />}
              {next && <Link className="nx" href={`/help/${next.id}`}><span className="small muted">Next</span><b>{next.title}</b></Link>}
            </nav>
          </article>
          <HcContact />
        </main>
      </div>
    );
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>{body}</div>
    </div>
  );
}
