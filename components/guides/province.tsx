import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { PGD, PGREG, pgByC, pgSlug, type Prov } from "@/lib/guides/data";
import { pgLink } from "@/lib/guides/links";
import { ProvincePicker } from "@/components/guides/picker";

const FI = ["pct", "shieldp", "cash", "doc"];
const SI = ["briefcase", "pie", "users", "bars", "ship"];
const initials = (n: string) => n.split(" ").filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join("");

function Ext({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

/** The left menu of provinces grouped by region (Update 13). */
function PgNav({ cur }: { cur?: string }) {
  return (
    <nav className="card pgnav" aria-label="Provinces and territories">
      <p className="pgkick">Provinces &amp; territories</p>
      {PGREG.map(([reg, codes]) => (
        <div key={reg} style={{ display: "contents" }}>
          <p className="pgreg">{reg}</p>
          {codes.map((c) => {
            const p = pgByC(c)!;
            return <Link key={c} href={`/guides/${pgSlug(p.n)}`} aria-current={cur === c ? "page" : undefined}><span>{p.n}</span><small>{c}</small></Link>;
          })}
        </div>
      ))}
      <Link className="pgall" href="/guides">All guides</Link>
    </nav>
  );
}

/** One province page (Update 13, redesigned like the CanadianSME.ca province pages; Update 14 lighter type). */
export function ProvincePage({ p, counts }: { p: Prov; counts: [number, number, number] }) {
  const c = p.c;
  const slug = pgSlug(p.n);
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <nav className="crumbs pgcrumbs" aria-label="Breadcrumb"><Link href="/feed">Home</Link><span>/</span><Link href="/guides">Business guides</Link><span>/</span><span aria-current="page">{p.n}</span></nav>
      <ProvincePicker current={slug} options={PGD.map((x) => [pgSlug(x.n), x.n])} />
      <div className="pgwrap">
        <PgNav cur={c} />
        <div className="pgmain">
          <section className="pghero" aria-labelledby="pgh1">
            <div className="pgsky" aria-hidden="true" />
            <div className="pghin">
              <p className="pgpill"><span className="pgdot" aria-hidden="true" />Province guide · {c}</p>
              <p className="pgpre">Doing business in</p>
              <h1 id="pgh1">{p.n}</h1>
              <p className="pgsub">{p.sub}</p>
              <div className="pgbtns">
                <a className="pgb red" href="#pgstart">Start a business here →</a>
                <a className="pgb" href="#pgfund">Grants &amp; funding</a>
                <a className="pgb" href="#pgwatch">What to watch in {p.n}</a>
              </div>
              <div className="pgfacts">
                {p.f.map((x, i) => (
                  <div key={x[0]} className="pgfact"><span className="pgfi"><Ic n={FI[i]} s={18} /></span><p className="pgfl">{x[0]}</p><p className="pgfv">{x[1]}</p><p className="pgfn">{x[2]}</p></div>
                ))}
              </div>
            </div>
          </section>

          <section className="pgglance" aria-labelledby="pgg">
            <p className="pgkick2">About the province</p>
            <h2 id="pgg">{p.n} at a glance</h2>
            <div className="pgg2">
              <div className="card pgfactsl">
                <div className="pgrow"><span className="pgri"><Ic n="capitol" s={18} /></span><div><p className="pglab">Capital</p><p className="pgval">{p.cap}</p></div></div>
                <div className="pgrow"><span className="pgri"><Ic n="city" s={18} /></span><div><p className="pglab">Largest city</p><p className="pgval">{p.city}</p></div></div>
                <div className="pgrow"><span className="pgri"><Ic n="factory" s={18} /></span><div><p className="pglab">Key industries</p><div className="pgchips">{p.ind.map((x) => <span key={x}>{x}</span>)}</div></div></div>
                <div className="pgrow pgnet"><div><p className="pglab">Local business network</p><p className="pgval">{p.net}</p></div></div>
              </div>
              <div className="card pgwho">
                <h3>Who’s who for small business</h3>
                <div className="pgppl">
                  {p.who.map((w) => {
                    const [name, role, tag] = w.split("|");
                    return <div key={name} className="pgp"><span className="pgtag">{tag}</span><span className="pgav" aria-hidden="true">{initials(name)}</span><p className="pgpn">{name}</p><p className="pgpr">{role}</p></div>;
                  })}
                </div>
              </div>
            </div>
            <div className="pgstats">
              {p.st.map((x, i) => (
                <div key={x[1]} className="pgstat"><span className="pgsi"><Ic n={SI[p.st.length === 4 && i > 0 ? i + 1 : i]} s={16} /></span><p className="pgsv">{x[0]}</p><p className="pgsl">{x[1]}</p><p className="pgsn">{x[2]}</p></div>
              ))}
            </div>
            <p className="pgsrc">Source: Innovation, Science and Economic Development Canada, Key Small Business Statistics 2025 (Statistics Canada Business Register).</p>
          </section>

          <div className="pgbody">
            <article className="pgart">
              <h2>{p.h}</h2>
              {p.a.map((s, i) => (
                <div key={i} style={{ display: "contents" }}>
                  {s[0] && <h3>{s[0]}</h3>}
                  {s.slice(1).map((t, j) => <p key={j}>{t}</p>)}
                </div>
              ))}
              <h3>Discover {p.n}’s business community</h3>
              <p>CanadianSME shares the stories, insights and experiences of {p.n}’s entrepreneurs and business leaders, and on SME Hub you can meet them directly.</p>
              <section className="pgsteps" id="pgstart" aria-labelledby="pgs">
                <p className="pgkick3">Step-by-step guide</p>
                <h2 id="pgs">How to start a business in {p.n}</h2>
                <ol>
                  {p.s.map((s, i) => (
                    <li key={s[0]}><span className="pgn" aria-hidden="true">{i + 1}</span><div><h3>{s[0]}</h3><p>{s[1]}</p><Ext className="pglink" href={pgLink(c, s[2], slug)}>{s[2]} <Ic n="ext" s={13} /></Ext></div></li>
                  ))}
                </ol>
              </section>
              <section id="pgwatch" aria-labelledby="pgw">
                <h2 id="pgw" className="pgh2">What to watch in {p.n}</h2>
                <ol className="pgwatch">{p.w.map((x, i) => <li key={i}><span>0{i + 1}</span><p>{x}</p></li>)}</ol>
              </section>
              {p.g.map(([title, links], i) => (
                <section key={title} id={i === 1 ? "pgfund" : undefined}>
                  <h2 className="pgh2">{title === "Federal support in " ? title + p.n : title}</h2>
                  <div className="pglinks">
                    {links.map(([n, d]) => (
                      <Ext key={n} className="pglc" href={pgLink(c, n, slug)}><span className="pglt">{n}</span><Ic n="ext" s={16} /><span className="pgld">{d}</span></Ext>
                    ))}
                  </div>
                </section>
              ))}
              <p className="pgrev">Reviewed October 2026. Rates, thresholds and programmes change: confirm with the official source before you file or apply. CanadianSME is not affiliated with these agencies.</p>
            </article>
            <aside className="pgaside">
              <div className="pgcard pghub">
                <p className="pgkick3">SME Hub in {p.n}</p>
                <div className="pghubn"><div><b>{counts[0]}</b><span>members</span></div><div><b>{counts[1]}</b><span>businesses</span></div><div><b>{counts[2]}</b><span>for sale</span></div></div>
                <Link className="btn sm" href="/members">Meet owners here</Link>
                <Link className="btn sm ghost" href={`/businesses?prov=${c}`}>Find local businesses</Link>
                <Link className="btn sm ghost" href={`/for-sale?prov=${c}`}>Businesses for sale here</Link>
              </div>
              <div className="pgcard pgfundc">
                <p className="pgkick3">Funding finder</p>
                <h3>Grants and financing for {p.n}</h3>
                <Link className="btn dark sm" href={`/grants?prov=${c}`}>See programmes →</Link>
              </div>
              <div className="pgcard pgdl">
                <h3>{p.n} deadlines on SME Hub</h3>
                <p>Add your GST/HST, payroll and tax dates to your account. We’ll remind you by email and in the bell before each one.</p>
                <Link className="btn sm white" href={`/deadlines?prov=${c}`}>Set up my deadlines</Link>
              </div>
              <div className="pgcard">
                <h3>Run the numbers</h3>
                <p>Free calculators built for Canadian rules.</p>
                <Link className="btn sm ghost" href="/tools/gst">GST/HST calculator</Link>
                <Link className="pgmore" href="/tools">All business tools</Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div></div>
  );
}

/** All provinces and territories, by region (Update 13). */
export function ProvinceIndex() {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <nav className="crumbs pgcrumbs" aria-label="Breadcrumb"><Link href="/feed">Home</Link><span>/</span><span aria-current="page">Business guides</span></nav>
      <div className="pgihead">
        <p className="pgkick2">Province guides</p>
        <h1>Doing business in every province and territory</h1>
        <p>Sales tax, payroll rules, how to register, funding and what to watch, for all 13 provinces and territories. Reviewed October 2026.</p>
      </div>
      {PGREG.map(([reg, codes]) => (
        <section key={reg} className="pgiregion" aria-label={reg}>
          <h2>{reg}</h2>
          <div className="pgigrid">
            {codes.map((c) => {
              const p = pgByC(c)!;
              return <Link key={c} className="pgic" href={`/guides/${pgSlug(p.n)}`}><span className="pgicode">{c}</span><span className="pgin">{p.n}</span><span className="pgit">{p.f[0][1]}</span><span className="pgicap">Capital: {p.cap}</span></Link>;
            })}
          </div>
        </section>
      ))}
    </div></div>
  );
}
