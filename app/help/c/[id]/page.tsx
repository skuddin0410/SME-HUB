import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadHelp } from "@/lib/help";
import { HIcon } from "@/components/help/icons";
import { Crumbs, HRow, HelpCard } from "@/components/help/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = (await loadHelp()).topics.find((t) => t.id === id);
  return { title: { absolute: c ? `${c.title} | SME Hub Help Centre` : "SME Hub Help Centre" } };
}

export default async function HelpTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kb = await loadHelp();
  const c = kb.topics.find((t) => t.id === id);
  if (!c) notFound();
  const list = kb.articles.filter((a) => a.topic === id);
  return (
    <>
      <Crumbs items={[{ href: "/help", label: "Help Centre" }, { label: c.title }]} />
      <div className="chead">
        <span className="ico" style={{ width: 56, height: 56 }}><HIcon n={c.icon} s={26} /></span>
        <div><h1>{c.title}</h1><p>{c.description}</p></div>
      </div>
      <div className="grid2">
        <div className="card" style={{ padding: "8px 18px" }}><ul className="list">{list.map((a) => <HRow key={a.id} a={a} />)}</ul></div>
        <div><HelpCard /></div>
      </div>
    </>
  );
}
