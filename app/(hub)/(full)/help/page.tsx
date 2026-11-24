import type { Metadata } from "next";
import { loadHelp, searchHelp, topicIcon } from "@/lib/help";
import { HelpHome } from "@/components/help/hub";
import "@/styles/help.css";
import "@/styles/help-extra.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Help Centre | SME Hub" },
  description: "Step-by-step answers with screenshots for every part of SME Hub, from your first post to running your business page.",
  alternates: { canonical: "/help" },
};

/** Help home (Update 7): inside the site, with the same header, footer and sign-in. */
export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, kb] = await Promise.all([searchParams, loadHelp()]);
  const topics = kb.topics.map((c) => ({ id: c.id, title: c.title, description: c.description, icon: topicIcon(c.icon), n: kb.articles.filter((a) => a.topic === c.id).length }));
  const popular = kb.articles.filter((a) => a.popular).slice(0, 8).map((a) => ({ id: a.id, title: a.title }));
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <HelpHome count={kb.articles.length} popular={popular} topics={topics} q0={q} hits0={q.trim() ? searchHelp(kb, q) : []} />
      </div>
    </div>
  );
}
