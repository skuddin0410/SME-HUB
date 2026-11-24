import type { Metadata } from "next";
import { loadHelp, searchHelp, topicIcon, helpHomeLists } from "@/lib/help";
import { getHubSettings } from "@/lib/zip/settings-load";
import { HelpHome } from "@/components/help/hub";
import "@/styles/help.css";
import "@/styles/help-extra.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Help Centre | SME Hub" },
  description: "Step-by-step answers with screenshots for every part of SME Hub, from your first post to running your business page.",
  alternates: { canonical: "/help" },
};

/** Help home (Update 8, "support desk"): inside the site, with the same header, footer and sign-in. */
export default async function HelpPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, kb, set] = await Promise.all([searchParams, loadHelp(), getHubSettings("help")]);
  const topics = kb.topics.map((c) => ({ id: c.id, title: c.title, description: c.description, icon: topicIcon(c.icon), n: kb.articles.filter((a) => a.topic === c.id).length }));
  const { chips, popular } = helpHomeLists(kb, set);
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <HelpHome popular={popular} topics={topics} chips={chips} q0={q} hits0={q.trim() ? searchHelp(kb, q) : []} />
      </div>
    </div>
  );
}
