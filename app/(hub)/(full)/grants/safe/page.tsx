import { Ic } from "@/components/zip/ic";
import { GfNav, GfWrap } from "@/components/grants/bits";
import { pageMeta } from "@/lib/seo";
import "@/styles/tools.css";
import "@/styles/grants.css";

export const metadata = pageMeta({ title: "How to spot a grant scam", description: "Scammers copy government websites and promise free money. Here’s how Canadian small businesses can tell.", path: "/grants/safe" });

const TIPS: [string, string, string][] = [
  ["x", "They ask for a fee to get you a grant", "Real government programs don’t charge you to apply."],
  ["x", "They promise you’ll be approved", "Nobody can promise that. Every program decides for itself."],
  ["x", "They offer “special access”", "There is no secret list. Programs are public."],
  ["check", "Official sites end in canada.ca or .gc.ca", "Provincial sites use their own government address."],
];

/** Update 15: Avoid scams. */
export default function Page() {
  return (
    <GfWrap>
      <div className="tlpage gfpage">
        <GfNav on="safe" />
        <section className="tlhero"><p className="pgkick2">Stay safe</p><h1>How to spot a grant scam</h1><p>Scammers copy government websites and promise “free money”. Here’s how to tell.</p></section>
        <div className="tlgrid">
          {TIPS.map(([i, h, p]) => <div key={h} className="tlcard"><span className={`tlico${i === "x" ? " gfbad" : ""}`}><Ic n={i} s={20} /></span><h2>{h}</h2><p>{p}</p></div>)}
        </div>
        <div className="card"><h2>Think you’ve seen a scam?</h2><p>Report it to the <a href="https://antifraudcentre-centreantifraude.ca/report-signalez-eng.htm" target="_blank" rel="noopener noreferrer">Canadian Anti-Fraud Centre</a> or the <a href="https://www.competitionbureau.gc.ca/" target="_blank" rel="noopener noreferrer">Competition Bureau</a>, and <a href="/contact">tell our team</a> so we can warn other members.</p></div>
      </div>
    </GfWrap>
  );
}
