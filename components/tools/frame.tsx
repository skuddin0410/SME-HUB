import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { TOOLS, TLX } from "@/lib/tools/data";
import { MapleStrip } from "@/components/maple/dock";

const short = (n: string) => n.replace(" Calculator", "").replace(" Estimator", "").replace(" Forecaster", "");

export const TLNOTE = (
  <div className="tlnote"><b>Example and reference only</b><p>These calculators are planning aids built on published 2026 federal and provincial rates. They use simplified assumptions and are not exact. Don’t use them to file a return, remit deductions or commit to financing. Check any figure with your accountant or the relevant tax authority before you act on it. Nothing here is tax, accounting or financial advice.</p></div>
);

export function TlNav({ cur }: { cur: string }) {
  return (
    <nav className="tlnav" aria-label="Business tools">
      <Link href="/tools" aria-current={cur === "all" ? "page" : undefined}>All tools</Link>
      {TOOLS.map(([id, n]) => <Link key={id} href={`/tools/${id}`} aria-current={cur === id ? "page" : undefined}>{short(n)}</Link>)}
    </nav>
  );
}

/** Business tools: the 7 calculators, as on canadiansme.ca/tools/ (Update 13). */
export function ToolsIndex() {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}><MapleStrip page="tools" /><div className="tlpage">
      <TlNav cur="all" />
      <section className="tlhero"><p className="pgkick2">Free tools</p><h1>Calculators built for Canadian rules</h1><p>Every calculator uses current federal and provincial rates, not a generic template with a Canadian flag on it. Nothing you type is stored. Results are examples for reference only.</p></section>
      <div className="tlgrid">
        {TOOLS.map(([id, n, ic, d]) => <Link key={id} className="tlcard" href={`/tools/${id}`}><span className="tlico"><Ic n={ic} s={20} /></span><h2>{n}</h2><p>{d}</p><span className="tlopen">Open calculator →</span></Link>)}
        <div className="tlcard tldl"><span className="tlico"><Ic n="cal2" s={20} /></span><h2>Never miss a tax deadline</h2><p>Add your GST/HST, payroll and income tax dates to SME Hub and get reminders by email and in the bell.</p><Link className="tlopen" href="/deadlines">Set up my deadlines →</Link></div>
      </div>
      {TLNOTE}
    </div></div></div>
  );
}

export function ToolPage({ id, lead, children }: { id: string; lead: string; children: React.ReactNode }) {
  const t = TOOLS.find((x) => x[0] === id)!;
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}><div className="tlpage">
      <TlNav cur={id} />
      <nav className="crumbs pgcrumbs" aria-label="Breadcrumb"><Link href="/tools">Business tools</Link><span>/</span><span aria-current="page">{t[1]}</span></nav>
      <h1 className="tlh1">{t[1]}</h1>
      <p className="tllead">{lead}</p>
      {children}
      {TLNOTE}
    </div></div></div>
  );
}

/** Payroll and self-employed open the full calculators on CanadianSME.ca for now, so both sites give the same numbers. */
export function ToolExternal({ id }: { id: string }) {
  const t = TOOLS.find((x) => x[0] === id)!;
  return (
    <>
      <div className="card tlmove">
        <span className="tlico"><Ic n={t[2]} s={20} /></span>
        <div>
          <h2>This calculator uses full 2026 tax tables</h2>
          <p>It is moving over from CanadianSME.ca so the numbers stay identical in both places. Until then it opens on CanadianSME.ca in a new tab.</p>
          <a className="btn" href={TLX[id]} target="_blank" rel="noopener noreferrer">Open on CanadianSME.ca <Ic n="ext" s={14} /></a>
        </div>
      </div>
      {id === "selfemployed" ? (
        <div className="card tlnext"><b>Pay tax by instalments?</b><span className="small muted">Add the March, June, September and December instalment dates to My deadlines.</span><Link className="btn sm" href="/deadlines">My deadlines</Link></div>
      ) : (
        <div className="card tlnext"><b>Remit payroll on time.</b><span className="small muted">Add your CRA payroll remittance dates and the T4 deadline to My deadlines.</span><Link className="btn sm" href="/deadlines">My deadlines</Link></div>
      )}
    </>
  );
}
