import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { Ic } from "@/components/zip/ic";
import { AskHub } from "@/components/ask/ask";
import { Suspense } from "react";
import { GoodMorning } from "@/components/matches/good-morning";
import type { Ask } from "@/lib/ask";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Ask the Hub", description: "Ask a business question. Answers come from member posts, advisors and CanadianSME articles, and point you to people who can help.", path: "/ask", index: false });

export default async function AskPage() {
  const { supabase, userId } = await getViewer();
  if (!userId) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="card">
          <h1 style={{ fontSize: 22 }}>Ask the Hub</h1>
          <p className="muted">Join free to ask the Hub’s AI assistant. Free members get 10 questions a month.</p>
          <Link className="btn" href="/auth/sign-up" style={{ alignSelf: "flex-start" }}>Join free</Link>
        </div>
      </div></div>
    );
  }
  const [hist, left] = await Promise.all([
    supabase.from("ai_asks").select("id, question, answer, sources, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.rpc("hub_ai_left"),
  ]);
  const asks: Ask[] = ((hist.data ?? []) as { id: string; question: string; answer: string; sources: Ask["sources"]; created_at: string }[]).map((r) => ({
    id: r.id, q: r.question, answer: r.answer, created_at: r.created_at, sources: { posts: r.sources?.posts ?? [], members: r.sources?.members ?? [], biz: r.sources?.biz ?? [] },
  }));
  const l = (left.data as { used?: number; limit?: number | null } | null) ?? null;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <h1>Ask the Hub <span className="tag ai" style={{ verticalAlign: "middle" }}>AI</span></h1>
          <p className="muted">Answers come from member posts, advisors and CanadianSME articles, and always point you to people who can help.</p>
        </div>
        <div className="cols">
          <section className="mid">
            <AskHub initial={asks} left={{ used: l?.used ?? 0, limit: l ? (l.limit ?? null) : 10 }} aiOn={!!process.env.ANTHROPIC_API_KEY} />
          </section>
          <aside className="rail" style={{ flexBasis: 300 }}>
            <Suspense fallback={null}><GoodMorning /></Suspense>
            <div className="card">
              <div className="row"><h2 className="grow">Funding matches</h2><span className="tag ai">AI</span></div>
              <p className="muted small">From the CanadianSME AI Grant Finder. Find grants, loans and programs that fit your business.</p>
              <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href="/grants"><Ic n="spark" />Open the Grant Finder</Link>
            </div>
            <div className="card">
              <h2>What the AI does here</h2>
              <div className="list">
                {["Finds answers members and advisors already gave", "Sends new questions to members who can help", "Suggests introductions each week", "Tidies your post and translates posts into French"].map((t) => <div key={t} className="small">{t}</div>)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
