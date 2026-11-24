import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { BriefingForm } from "@/components/about/briefing-form";

const HELP: [string, string, string, string, string][] = [
  ["users", "Network", "Meet owners, suppliers and advisors near you. Ask for warm introductions and referrals.", "/network", "Find people →"],
  ["building", "Business Directory", "List your business free, collect reviews and get found by customers across Canada.", "/businesses", "Browse businesses →"],
  ["coin", "Grant Finder", "Search grants, loans and tax credits from every province and territory, in plain language.", "/grants", "Find funding →"],
  ["cal2", "My deadlines", "GST/HST, payroll and income tax dates with reminders, so you never pay a late penalty.", "/deadlines", "Set up deadlines →"],
  ["calc", "Business tools", "Free calculators built for Canadian rules: sales tax, loans, pricing, import costs and cash flow.", "/tools", "Open the tools →"],
  ["book", "Province guides", "How to start, register and find funding in all 13 provinces and territories.", "/guides", "Read the guides →"],
];
const RUNS: [string, string, string, string][] = [
  ["Small Business Show", "Canada’s gathering for owners who want to grow, with workshops, exhibitors and networking.", "cal", "Live event"],
  ["Small Business Summit", "Talks on digital growth, inclusion and staying adaptable, with an exhibition floor.", "users", "Conference"],
  ["National Small Business Awards", "Celebrating the owners who make Canada’s economy work.", "trophy", "Awards"],
  ["Small Business Podcast", "Founders, lenders and policy experts on the problems owners face, and how they solved them.", "play", "Podcast"],
];
const PAST: [string, string][] = [["October 2026", "95"], ["September 2026", "94"], ["August 2026", "93"], ["July 2026", "92"], ["June 2026", "91"]];
const MAG = "https://canadiansme.ca/";

/** Update 15: the new About page, modelled on canadiansme.ca/about. */
export function AboutPage({ member }: { member: boolean }) {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}><div className="xabpage">
      <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/feed">Home</Link> / About</nav>
      <section className="xabhero">
        <div>
          <p className="pgkick2">About SME Hub</p>
          <h1>Where <em>Canada’s</em> small business owners meet, learn and grow</h1>
          <p>SME Hub is Canada’s small business network, built by CanadianSME Small Business Magazine. One free place to find customers and suppliers, get funding and deadline help, and talk to owners who have been where you are.</p>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>{member ? <Link className="btn" href="/feed">Go to the feed →</Link> : <Link className="btn" href="/auth/sign-up">Join free →</Link>}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zip/img/community.jpg" alt="Small business owners talking at a CanadianSME event" />
      </section>
      <section className="xabstats" aria-label="CanadianSME in numbers">
        <div><b>2018</b><span>CanadianSME founded</span></div><div><b>120K+</b><span>monthly magazine readers</span></div><div><b>13</b><span>province and territory guides</span></div><div><b>Free</b><span>to join, for every owner</span></div>
      </section>
      <section className="xmag">
        <div className="xmagtop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a className="xmagcover" href={MAG} target="_blank" rel="noopener noreferrer"><img src="/zip/img/mag-2026-11.jpg" alt="CanadianSME Small Business Magazine, November 2026 cover featuring Ben Osmow, CEO of Osmow’s" /></a>
          <div className="xmagtxt">
            <span className="xmagpill"><i />November 2026<b>Issue 96</b></span>
            <h2>The magazine</h2>
            <span className="xmagbar" />
            <p>CanadianSME Small Business Magazine is free to read every month: interviews, research and practical advice for Canada’s SMEs.</p>
            <ul>
              <li><span><Ic n="msg" s={18} /></span><div><b>Owner interviews</b> with Canadian founders, leaders and policy makers</div></li>
              <li><span><Ic n="chart" s={18} /></span><div><b>Practical advice</b> on funding, tax, hiring, technology and growth</div></li>
              <li><span><Ic n="spark" s={18} /></span><div><b>Free every month</b>, read online or in the digital edition</div></li>
            </ul>
            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <a className="btn xmagred" href={MAG} target="_blank" rel="noopener noreferrer"><Ic n="book" s={16} />Read the latest issue</a>
              <a className="btn" href="#abmail">Subscribe free</a>
            </div>
          </div>
        </div>
        <div className="xmagpast">
          <h3>Past issues</h3>
          <ul>
            {PAST.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={m[1]}><a href={MAG} target="_blank" rel="noopener noreferrer"><img src={`/zip/img/mag-p${i}.jpg`} alt={`CanadianSME Magazine, ${m[0]} cover`} loading="lazy" /><b>{m[0]}</b><small>Issue {m[1]}</small></a></li>
            ))}
          </ul>
        </div>
        <div className="xmagfoot"><p>Read <b>any past issue</b> of CanadianSME Small Business Magazine online.</p><a className="btn" href={MAG} target="_blank" rel="noopener noreferrer">Browse all issues →</a></div>
      </section>
      <section className="xabsec">
        <p className="pgkick2">How the Hub helps</p>
        <h2>One platform, many ways to grow</h2>
        <div className="xabgrid">{HELP.map((h) => <Link key={h[1]} className="xabcard" href={h[3]}><span className="xabico"><Ic n={h[0]} s={20} /></span><h3>{h[1]}</h3><p>{h[2]}</p><span className="xabmore">{h[4]}</span></Link>)}</div>
      </section>
      <section className="xabwhy">
        <div>
          <p className="pgkick2">Why we exist</p>
          <h2>Small business support you can trust</h2>
          <p>CanadianSME started in 2018 out of a simple belief: owners do better when they are not alone. The magazine, podcast, events and awards gave owners a voice. SME Hub gives them each other.</p>
          <p>Small and medium-sized businesses make up more than 97% of businesses in Canada. Our goal is to bring one million of them onto one network, so every owner can find a customer, a supplier, an answer or a friend in minutes.</p>
        </div>
        <div className="xabquote"><b>97%+</b><p>of businesses in Canada are small and medium-sized. They deserve a network built for them.</p></div>
      </section>
      <section className="xabsec">
        <p className="pgkick2">What guides us</p>
        <div className="xabthree">
          <div><h3>Our approach</h3><p>Everything on the Hub starts with a real owner problem: finding customers, staff, funding and time. If it doesn’t help with one of those, we don’t build it.</p></div>
          <div><h3>Our promise</h3><p>Free to join, honest information, and no spam. We never sell your contact details, and we never charge you to get a grant.</p></div>
          <div><h3>Our mission</h3><p>Connect Canada’s small businesses with each other and with the tools, funding and people that help them grow, in every province and territory.</p></div>
        </div>
      </section>
      <section className="xfam">
        <div className="xabhead">
          <div><p className="pgkick2">What we run</p><h2>The CanadianSME family</h2><p className="xfamsub">Live events, national awards and a podcast that have brought Canadian owners together since 2018.</p></div>
          <Link href="/events" className="btn ghost">All events →</Link>
        </div>
        <div className="xfamrow">{RUNS.map((r, i) => <article key={r[0]} className={`xfamcard c${i}`}><div className="xfamtop"><span className="xfamico"><Ic n={r[2]} s={22} /></span><span className="xfamkind">{r[3]}</span></div><h3>{r[0]}</h3><p>{r[1]}</p></article>)}</div>
      </section>
      <section className="xabnews">
        <div><h2>Get the weekly Hub briefing</h2><ul>{["New funding and grant deadlines", "CRA dates for your province", "New members to meet near you", "Events and magazine issues"].map((t) => <li key={t}><Ic n="check" s={14} />{t}</li>)}</ul></div>
        <BriefingForm />
      </section>
      <section className="xabcontact">
        <div><h3>Published by Cmarketing Inc.</h3><p>6345 Dixie Rd, Unit 202, Mississauga, ON L5T 2E6</p><p>+1 437 778 4446 · +1 416 655 0205</p></div>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}><a className="btn ghost" href="mailto:support@smehub.ca">support@smehub.ca</a><a className="btn" href="mailto:info@canadiansme.ca">Contact the team →</a></div>
      </section>
    </div></div></div>
  );
}
