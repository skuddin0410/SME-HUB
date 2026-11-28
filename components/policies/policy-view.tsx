import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { POL_GROUPS, POL_ICON, POL_LINKS, POL_UPDATED, POLICIES_V2, polHref, type Policy } from "@/lib/policies";
import { CookieButton, PrintButton } from "./client";

/** Update 45: a policy page and the list of all policies, as in the guide (side menu "Policies and help"). */

const SIDE: [string, string][] = [
  ["/policies", "All policies"], ["/help", "Frequently asked questions"], [polHref("guidelines"), "Community guidelines"], [polHref("terms"), "Terms and conditions"],
  [polHref("privacy"), "Privacy policy"], [polHref("cookies"), "Cookies"], [polHref("membership-terms"), "Membership and refunds"], [polHref("provider-terms"), "Advisor, course and event terms"],
  [polHref("advertising-policy"), "Advertising and reviews"], [polHref("accessibility"), "Accessibility"], [polHref("content-complaints"), "Complaints and copyright"], [polHref("email-preferences"), "Email preferences"],
];

function Shell({ current, children }: { current: string; children: React.ReactNode }) {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
      <div className="cols">
        <section className="mid">{children}</section>
        <aside className="rail" style={{ flexBasis: 280 }}>
          <div className="card">
            <p className="eyebrow">In this section</p>
            <h2>Policies and help</h2>
            <nav className="sidenav" aria-label="Policies and help">
              {SIDE.map(([h, l]) => <Link key={h} href={h} aria-current={current === h ? "page" : undefined}>{l}</Link>)}
            </nav>
          </div>
          <div className="card">
            <h2>Questions?</h2>
            <p className="muted small">The CanadianSME team answers every message, usually within one business day.</p>
            <span className="small">support@smehub.ca</span>
            <Link className="small" href="/contact">All contact details</Link>
          </div>
        </aside>
      </div>
    </div></div>
  );
}

const ANY = /\[([^\]]{20,})\]|([a-z]+@(?:smehub|canadiansme)\.ca)|(priv\.gc\.ca)|(416-655-0205)|(Select Cookie settings)/g;

/** Turns a paragraph into text with its links: other policies (first mention), emails, the Privacy Commissioner, the phone, and fill-in marks. */
function Inline({ text, self, used }: { text: string; self: string; used: Set<string> }) {
  // policy names first: split the text where each not-yet-linked policy is first named
  const parts: (string | React.ReactNode)[] = [text];
  for (const [name, id] of POL_LINKS) {
    if (id === self || used.has(id)) continue;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p !== "string") continue;
      const at = p.indexOf(name);
      if (at < 0) continue;
      parts.splice(i, 1, p.slice(0, at), <Link key={`${id}-l`} href={polHref(id)}>{name}</Link>, p.slice(at + name.length));
      used.add(id);
      break;
    }
  }
  const out: React.ReactNode[] = [];
  parts.forEach((p, k) => {
    if (typeof p !== "string") return void out.push(p);
    let last = 0;
    for (const m of p.matchAll(ANY)) {
      if (m.index! > last) out.push(p.slice(last, m.index));
      const key = `${k}-${m.index}`;
      if (m[1]) out.push(<mark key={key} className="poltbc" title="To fill in before this page goes live">{m[1]}</mark>);
      else if (m[2]) out.push(<a key={key} href={`mailto:${m[2]}`}>{m[2]}</a>);
      else if (m[3]) out.push(<a key={key} href="https://www.priv.gc.ca" target="_blank" rel="noopener">priv.gc.ca</a>);
      else if (m[4]) out.push(<a key={key} href="tel:+14166550205">416-655-0205</a>);
      else if (m[5]) out.push(self === "cookies" ? <span key={key}>Select <CookieButton className="polinl" /></span> : m[5]);
      last = m.index! + m[0].length;
    }
    if (last < p.length) out.push(p.slice(last));
  });
  return <>{out}</>;
}

const words = (p: Policy) => p.b.reduce((n, b) => n + b.slice(1).join(" ").split(/\s+/).length, 0);
const tbc = (p: Policy) => p.b.reduce((n, b) => n + (b[0] === "tbc" ? 1 : (b.slice(1).join(" ").match(/\[[^\]]{20,}\]/g) ?? []).length), 0);

export function PolicyView({ p }: { p: Policy }) {
  const heads = p.b.filter((b) => b[0] === "h");
  const n = tbc(p);
  const used = new Set<string>();
  let hi = 0;
  return (
    <Shell current={`/policies/${p.slug}`}>
      <article className="card doc pol">
        <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/policies">Policies</Link> / {p.title}</nav>
        <header className="polhd">
          <span className="polic"><Ic n={POL_ICON[p.id] ?? "doc"} s={20} /></span>
          <div><h1>{p.title}</h1><p className="polmeta">Updated {POL_UPDATED} · {Math.max(1, Math.round(words(p) / 220))} min read</p></div>
        </header>
        <p className="lead">{p.short}</p>
        {n > 0 && <div className="polnote"><Ic n="info" s={16} /><span><b>{n} detail{n === 1 ? "" : "s"} still to fill in.</b> They’re marked in yellow. Fill them in before this page goes live.</span></div>}
        {heads.length >= 3 && (
          <nav className="poltoc" aria-label="On this page">
            <p className="poleye">On this page</p>
            <ol className={/^\d/.test(heads[0][1]) ? "polnum" : undefined}>
              {heads.map((h, i) => <li key={i}><a href={`#polh-${i}`}>{h[1]}</a></li>)}
            </ol>
          </nav>
        )}
        <div className="polbody">
          {p.b.map((b, i) => {
            if (b[0] === "h") return <h2 key={i} id={`polh-${hi++}`}>{b[1]}</h2>;
            if (b[0] === "tbc") return <div key={i} className="polbox"><Ic n="edit" s={15} /><span><b>To fill in before this page goes live</b>{b[1]}</span></div>;
            if (b[0] === "pl") return <p key={i}><b>{b[1]}.</b> <Inline text={b[2]} self={p.id} used={used} /></p>;
            return <p key={i}><Inline text={b[1]} self={p.id} used={used} /></p>;
          })}
        </div>
        <footer className="polfoot">
          <span>Questions about this policy? Email <a href="mailto:support@smehub.ca">support@smehub.ca</a>.<br />Cmarketing Inc., 6345 Dixie Road, Unit 202, Mississauga, ON L5T 2E6</span>
          <span className="row"><PrintButton /><Link className="btn sm ghost" href="/policies">All policies</Link></span>
        </footer>
      </article>
    </Shell>
  );
}

export function PolicyIndex() {
  return (
    <Shell current="/policies">
      <div className="card doc pol">
        <p className="eyebrow">Policies and help</p>
        <h1>SME Hub policies</h1>
        <p className="lead">The rules that keep SME Hub fair, safe and honest. Written to be read. Updated {POL_UPDATED}.</p>
        {POL_GROUPS.map(([g, label]) => {
          const L = POLICIES_V2.filter((p) => p.grp === g).sort((a, b) => (a.id === "guidelines" ? 0 : a.n) - (b.id === "guidelines" ? 0 : b.n));
          return (
            <div key={g} className="stack" style={{ gap: 10 }}>
              <h2>{label}</h2>
              <div className="polgrid">
                {L.map((p) => (
                  <Link key={p.id} className="polcard" href={`/policies/${p.slug}`}>
                    <span className="polic"><Ic n={POL_ICON[p.id] ?? "doc"} s={18} /></span>
                    <span className="stack grow" style={{ gap: 3 }}><b>{p.title}</b><small>{p.short}</small></span>
                    <Ic n="right" s={14} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        <div className="polhelp">
          <div><b>Need help reading a policy?</b><span>Email <a href="mailto:support@smehub.ca">support@smehub.ca</a> or call <a href="tel:+14166550205">416-655-0205</a>. We can send it in another format.</span></div>
          <CookieButton className="btn sm ghost" />
        </div>
      </div>
    </Shell>
  );
}
