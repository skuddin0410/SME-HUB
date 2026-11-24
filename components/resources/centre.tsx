/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { ProvincePicker } from "@/components/guides/picker";
import { CMD, CMREV, CMW, cmHref, type Centre } from "@/lib/resources/data";

const FI = ["users", "trend", "cash", "shieldp"];

function CmLink({ u, cls, children }: { u: string; cls: string; children: React.ReactNode }) {
  const ext = !u.startsWith("#");
  return ext ? <a className={cls} href={u} target="_blank" rel="noopener noreferrer">{children}</a> : <Link className={cls} href={cmHref(u)}>{children}</Link>;
}

function CmNav({ cur }: { cur: string }) {
  return (
    <nav className="card pgnav" aria-label="Community resource centres">
      <p className="pgkick">Resource centres</p>
      {CMD.map((c) => <Link key={c.k} href={`/resources/${c.slug}`} aria-current={c.k === cur ? "page" : undefined}>{c.n}</Link>)}
      <Link className="pgall" href="/resources">All resource centres →</Link>
    </nav>
  );
}

/** Update 15: a community resource centre, laid out like the province guides. */
export function CentrePage({ p }: { p: Centre }) {
  const low = p.n.toLowerCase();
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <nav className="crumbs pgcrumbs" aria-label="Breadcrumb"><Link href="/feed">Home</Link><span>/</span><Link href="/resources">Resource centres</Link><span>/</span><span aria-current="page">{p.n}</span></nav>
      <ProvincePicker current={p.slug} options={CMD.map((c) => [c.slug, c.n])} base="/resources" label="Resource centre" />
      <div className="pgwrap">
        <CmNav cur={p.k} />
        <div className="pgmain">
          <section className="cmhero" aria-labelledby="cmh1">
            <div className="cmhin">
              <p className="pgpill"><span className="pgdot" aria-hidden="true" />Resource centre</p>
              <h1 id="cmh1">{p.n}</h1>
              <p className="cmsub">{p.sub}</p>
              <div className="pgbtns"><a className="pgb red" href="#pgstart">Start here →</a><a className="pgb" href="#pgfund">Funding &amp; programs</a><a className="pgb" href="#pgwatch">What to watch</a></div>
            </div>
            <img src={`/zip/img/${p.img}.jpg`} alt={p.n} />
          </section>
          <div className="cmfacts">
            {p.f.map((x, i) => <div key={x[0]} className="cmfact"><span className="pgfi"><Ic n={FI[i]} s={18} /></span><p className="pgfl">{x[0]}</p><p className="cmfv">{x[1]}</p><p className="pgfn">{x[2]}</p></div>)}
          </div>
          <div className="pgbody">
            <article className="pgart">
              <h2>{p.h}</h2>
              {p.a.map((s, i) => <div key={i}>{s[0] && <h3>{s[0]}</h3>}<p>{s[1]}</p></div>)}
              <section className="pgsteps" id="pgstart" aria-labelledby="cms">
                <p className="pgkick3">Step-by-step guide</p>
                <h2 id="cms">Where to start</h2>
                <ol>
                  {p.s.map((s, i) => (
                    <li key={s[0]}><span className="pgn" aria-hidden="true">{i + 1}</span><div><h3>{s[0]}</h3><p>{s[1]}</p><CmLink u={s[3]} cls="pglink">{s[2]} <Ic n={s[3].startsWith("#") ? "right" : "ext"} s={13} /></CmLink></div></li>
                  ))}
                </ol>
              </section>
              <section id="pgwatch" aria-labelledby="cmw">
                <h2 id="cmw" className="pgh2">What to watch</h2>
                <ol className="pgwatch">{[...p.w, ...CMW].map((x, i) => <li key={i}><span>0{i + 1}</span><p>{x}</p></li>)}</ol>
              </section>
              {p.g.map((g, i) => (
                <section key={g[0]} id={i === 0 ? "pgfund" : undefined}>
                  <h2 className="pgh2">{g[0]}</h2>
                  <div className="pglinks">{g[1].map((l) => <CmLink key={l[0]} u={l[2]} cls="pglc"><span className="pglt">{l[0]}</span><Ic n="ext" s={16} /><span className="pgld">{l[1]}</span></CmLink>)}</div>
                </section>
              ))}
              <p className="pgrev">{CMREV}. Sources: {p.src.join("; ")}. Programs and amounts change: confirm with the official source before you apply. CanadianSME is not affiliated with these organizations.</p>
            </article>
            <aside className="pgaside">
              <div className="pgcard pghub"><p className="pgkick3">On SME Hub</p><h3>Meet {low}</h3><p>Connect with owners, mentors and buyers who understand your path.</p><Link className="btn sm" href="/groups">Find a group</Link><Link className="btn sm ghost" href="/members">Meet owners</Link><Link className="btn sm ghost" href="/smb-advisor">Talk to an advisor</Link></div>
              <div className="pgcard pgfundc"><p className="pgkick3">Funding finder</p><h3>Grants and loans for {low}</h3><Link className="btn dark sm" href="/grants">Open the Grant Finder →</Link></div>
              <div className="pgcard pgdl"><h3>Never miss a deadline</h3><p>Add your GST/HST, payroll and tax dates and we’ll remind you before each one.</p><Link className="btn sm white" href="/deadlines">Set up my deadlines</Link></div>
              {p.mag && <div className="pgcard"><p className="pgkick3">From CanadianSME</p><h3>{p.mag}</h3><p>Stories and advice from owners like you.</p></div>}
              <div className="pgcard"><h3>Run the numbers</h3><p>Free calculators built for Canadian rules.</p><Link className="btn sm ghost" href="/tools">Business tools</Link></div>
            </aside>
          </div>
        </div>
      </div>
    </div></div>
  );
}

export function CentreIndex() {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <nav className="crumbs pgcrumbs" aria-label="Breadcrumb"><Link href="/feed">Home</Link><span>/</span><span aria-current="page">Resource centres</span></nav>
      <div className="pgihead"><p className="pgkick2">Resource centres</p><h1>Support for every Canadian entrepreneur</h1><p>Funding, programs, step-by-step guides and community for women, Black, Indigenous, immigrant and 2SLGBTQI+ business owners. {CMREV}.</p></div>
      <div className="cmgrid">
        {CMD.map((c) => (
          <Link key={c.k} className="cmcard" href={`/resources/${c.slug}`}>
            <img src={`/zip/img/${c.img}.jpg`} alt="" loading="lazy" />
            <div><h2>{c.n}</h2><p>{c.sub}</p><span className="cmkey">{c.f[2][1]} · {c.f[2][0].toLowerCase()}</span><span className="cmgo">Open the guide →</span></div>
          </Link>
        ))}
      </div>
    </div></div>
  );
}
