"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { MapleLeaf, MapleTag } from "@/components/maple/leaf";
import { useMaple } from "@/components/maple/provider";
import { MapleComposer, MapleThread } from "@/components/maple/chat";

const HIDE_TAB = ["/ask", "/maple"];

/** Maple's chat beside the Messaging panel (Update 46). */
export function MapleDockPanel() {
  const m = useMaple();
  const path = usePathname();
  if (!m || !m.member || !m.settings.on || !m.dock || path === "/ask") return null;
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="mldockwrap">
        <section className="dpanel dchatp mldock" aria-label="Maple, SME Hub’s AI assistant">
          <div className="dhead">
            <MapleLeaf size={32} />
            <span className="stack grow" style={{ minWidth: 0 }}>
              <Link className="namebtn" href="/maple">Maple</Link>
              <span className="muted" style={{ fontSize: 11.5 }}>SME Hub’s AI assistant</span>
            </span>
            <Link className="dx" href="/ask" aria-label="Open full chat" onClick={() => m.closeDock()}><Ic n="expand" s={15} /></Link>
            <button type="button" className="dx" aria-label="Close Maple" onClick={() => m.closeDock()}>×</button>
          </div>
          <MapleThread compact id="mldock" />
          <div className="dfoot mldfoot">
            <MapleComposer id="mlqd" compact />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Maple pinned at the top of the Messaging list. */
export function MapleDockRow() {
  const m = useMaple();
  if (!m || !m.member || !m.settings.on) return null;
  const last = [...m.msgs].reverse().find((x) => !m.since || !x.at || x.at > m.since);
  return (
    <div className="zip">
      <button type="button" className="drow mldrow" aria-current={m.dock} onClick={() => m.toggleDock()}>
        <MapleLeaf size={36} />
        <span className="stack grow" style={{ minWidth: 0 }}>
          <strong>Maple <MapleTag /></strong>
          <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{last ? last.t.replace(/\*\*/g, "").slice(0, 40) : "Ask me anything about your business"}</span>
        </span>
        {!m.greeted && <span className="dcount" aria-label="1 new">1</span>}
      </button>
    </div>
  );
}

/** Update 48: the red "Ask Maple" tab on the right edge of every page. Still for people who ask for reduced motion. */
export function MapleTab() {
  const m = useMaple();
  const path = usePathname();
  if (!m || HIDE_TAB.includes(path)) return null;
  if (m.member && (!m.settings.on || m.dock)) return null;
  const inner = (
    <>
      <span className="mltarr" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
      </span>
      <span className="mltin">
        <MapleLeaf size={30} />
        <span className="mltxt">Ask Maple</span>
        <span className="mltai">AI</span>
      </span>
    </>
  );
  return (
    <div className="zip" style={{ display: "contents" }}>
      {m.member ? (
        <button type="button" className="mltab" aria-label="Ask Maple, SME Hub’s AI assistant" onClick={() => m.openDock()}>{inner}</button>
      ) : (
        <Link className="mltab" href="/auth/sign-up?next=/ask" aria-label="Ask Maple, SME Hub’s AI assistant">{inner}</Link>
      )}
    </div>
  );
}

const TIPS: Record<string, [string, string[]]> = {
  grants: ["grants", ["Which grants fit my business?", "Can I get a loan to buy equipment?"]],
  deadlines: ["your deadlines", ["When is my next GST/HST payment due?", "What happens if I file late?"]],
  tools: ["pricing and cash flow", ["How should I price a new service?", "How do I work out my break-even point?"]],
  jobs: ["hiring", ["How do I post a job?", "What should I pay a part-time employee?"]],
  events: ["events", ["What events are coming up?", "How do I get more from an event?"]],
};

/** Short "Ask Maple" prompts on Grant Finder, My deadlines, Business tools, Jobs and Events. */
export function MapleStrip({ page }: { page: keyof typeof TIPS }) {
  const m = useMaple();
  if (!m || !m.member || !m.settings.on || !m.settings.tips) return null;
  const [about, qs] = TIPS[page];
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="mlstrip">
        <MapleLeaf size={26} />
        <span className="grow"><b>Ask Maple</b> about {about}</span>
        {qs.map((q) => <button key={q} type="button" className="mlchip" onClick={() => m.askFrom(q)}>{q}</button>)}
      </div>
    </div>
  );
}

/** "Looking for an answer? Ask Maple" above feed search results. */
export function MapleSearchStrip({ q }: { q: string }) {
  const m = useMaple();
  const t = q.trim();
  if (!t || !m || !m.member || !m.settings.on) return null;
  return (
    <div className="zip" style={{ display: "contents" }}>
      <div className="mlstrip">
        <MapleLeaf size={26} />
        <span className="grow">Looking for an answer? <b>Ask Maple:</b> “{t.slice(0, 60)}”</span>
        <button type="button" className="btn sm" onClick={() => m.askFrom(t)}>Ask Maple</button>
      </div>
    </div>
  );
}

/** The side card that replaced "Ask the Hub". */
export function MapleBox() {
  const m = useMaple();
  if (m && m.member && !m.settings.on) return null;
  return (
    <div className="card mlbox">
      <div className="row">
        <MapleLeaf size={36} />
        <span className="stack grow" style={{ gap: 1 }}>
          <b>Ask Maple <MapleTag /></b>
          <small className="muted">Answers, people and tools in one place.</small>
        </span>
      </div>
      <Link className="btn sm" href="/ask" style={{ alignSelf: "flex-start" }}>Ask a question</Link>
    </div>
  );
}

/** Maple pinned at the top of the Messages page. */
export function MapleThreadLink() {
  const m = useMaple();
  if (!m || !m.member || !m.settings.on) return null;
  return (
    <Link className="thread mlthr" href="/ask">
      <MapleLeaf size={40} />
      <span className="stack grow">
        <strong>Maple <MapleTag /></strong>
        <span className="muted small">Your AI assistant. Ask anything.</span>
      </span>
    </Link>
  );
}
