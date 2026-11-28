import { pageMeta } from "@/lib/seo";
import { MapleChatPage } from "@/components/maple/pages";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Ask Maple", description: "Ask Maple, SME Hub’s AI assistant, a business question. Plain answers with sources, plus members and SME Advisors who can help.", path: "/ask", index: false });

/** Update 46: the full chat with Maple (replaces "Ask the Hub AI"). */
export default function AskPage() {
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <MapleChatPage />
      </div>
    </div>
  );
}
