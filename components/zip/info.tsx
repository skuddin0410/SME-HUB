/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MAGAZINE, POLICIES } from "@/lib/content";
import { CONTACT } from "@/lib/site";
import { getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { ContactForm } from "@/components/zip/contact-form";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

const Wrap = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40, ...(wide ? {} : { maxWidth: 900 }) }}>{children}</div></div>
);

export const FAQ: [string, string][] = [
  ["Do I need an account to look around?", "No. Anyone can read the public feed and browse members, groups and businesses. You need a free account to post, like, comment and connect."],
  ["How do I post?", "Open Home, click the box at the top of the feed, choose what you are sharing (question, win, offer, hiring or intro), write it and press Post. You can add one photo."],
  ["Who can see my post?", "You choose each time: anyone, members only, your connections, or only you. Posts inside a private group are visible to that group’s members."],
  ["How do connections work?", "Press Connect on a member’s card or profile. They get an alert and can accept or decline."],
  ["How do I report something?", "Use the three dots on any post that is not yours and choose Report. Our team reviews every report."],
  ["How does the AI assistant work?", "Ask the Hub answers from member posts, advisors and CanadianSME articles, and points you to members who can help. Free members get 10 questions a month."],
  ["How do I upgrade my plan?", "See Membership plans for what each plan includes, then contact us and we will set it up."],
];

export function ZipHelp() {
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">Policies and help</p>
        <h1>Help and frequently asked questions</h1>
        <p className="lead">Quick answers about accounts, posting, privacy, connections and plans. Still stuck? Email the team and we will help.</p>
        <div>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        <h2 id="contact">Contact us</h2>
        <ul>
          <li>{CONTACT.address}</li>
          <li>{CONTACT.phones.join(" or ")}</li>
          <li>{CONTACT.emails.join(" or ")}</li>
        </ul>
      </div>
    </Wrap>
  );
}

export function ZipContact() {
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">About SMB Hub</p>
        <h1>Contact us</h1>
        <p className="lead">Questions about your account, a membership plan or working with CanadianSME? Call or email and our team will help.</p>
        <div className="feat">
          <div><strong>Email</strong>{CONTACT.emails.map((e) => <a key={e} className="small" href={`mailto:${e}`}>{e}</a>)}</div>
          <div><strong>Phone</strong>{CONTACT.phones.map((p) => <a key={p} className="small" href={`tel:${p.replace(/\s/g, "")}`}>{p}</a>)}</div>
          <div><strong>Office</strong><span className="small">Cmarketing Inc.</span><span className="small">{CONTACT.address}</span></div>
        </div>
        <h2>Send a message</h2>
        <ContactForm />
      </div>
    </Wrap>
  );
}

export function ZipMagazine() {
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">About SMB Hub</p>
        <h1>CanadianSME Small Business Magazine</h1>
        <p className="lead">The magazine behind SMB Hub. Each issue covers growth, innovation and marketing for Canadian small and medium businesses.</p>
        <p className="eyebrow">Latest issue</p>
        <h2>{MAGAZINE.issue}</h2>
        <iframe src={MAGAZINE.reader} title={`CanadianSME Small Business Magazine, ${MAGAZINE.issue}`} allowFullScreen loading="lazy" style={{ width: "100%", aspectRatio: "4/3", border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface-2)" }} />
        <h2>More to read and hear</h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <Link className="btn ghost" href="/blog">Blog</Link>
          <Link className="btn ghost" href="/news">News</Link>
          <Link className="btn ghost" href="/podcast">Small Business Podcast</Link>
        </div>
      </div>
    </Wrap>
  );
}

export function ZipPolicy({ slug }: { slug: string }) {
  const p = POLICIES.find((x) => x.slug === slug)!;
  return (
    <Wrap>
      <div className="card doc">
        <p className="eyebrow">Policies and help</p>
        <h1>{p.title}</h1>
        <p className="lead">{p.intro}</p>
        {p.draft && <p className="draft">{p.draft}</p>}
        {p.sections.map((s) => (
          <div key={s.heading} className="stack" style={{ gap: 8 }}>
            <h2>{s.heading}</h2>
            {s.text && <p>{s.text}</p>}
            {s.points && <ul>{s.points.map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>
        ))}
        <h2>Good to know</h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {POLICIES.filter((x) => x.slug !== slug).map((x) => <Link key={x.slug} className="btn sm ghost" href={`/policies/${x.slug}`}>{x.label}</Link>)}
          <Link className="btn sm ghost" href="/help">Frequently asked questions</Link>
        </div>
      </div>
    </Wrap>
  );
}

const BEN: [string, string, string, string, string, string][] = [
  ["Guidance and mentorship", "Manuals, plus direct advice from experienced SMB Advisors.", "/smb-advisor", "users", "#2563EB", "Meet the advisors"],
  ["Access to resources", "How-to guides on everything from your first idea to regulatory compliance.", "/guides", "book", "#0F766E", "Open the guides"],
  ["Access to training courses", "Expert-led courses on marketing, sales, finance and strategy.", "/courses", "book", "#7C3AED", "Browse courses"],
  ["Exclusive offers from partners", "Member discounts from partners that lower your early costs.", "/membership-plans", "tag", "#B45309", "See the plans"],
  ["Buy or sell a business", "A marketplace that connects business buyers with sellers.", "/businesses", "store", "#BE185D", "Explore businesses"],
  ["Community and networking", "Meet other owners, share ideas and form partnerships.", "/groups", "msg", "#15803D", "Join a group"],
  ["Funding information", "Clear details on venture capital, angel investors and government grants.", "/ask", "coin", "#4338CA", "Ask about funding"],
  ["Opportunities for visibility", "Get recognised by customers, partners and investors.", "/pavilion", "eye", "#D42A2A", "Get listed"],
];
const NAV: [string, string][] = [["story", "Our story"], ["what", "What CanadianSME does"], ["hub", "Inside the Hub"], ["year", "A year with us"], ["benefits", "What members get"], ["resources", "Resource centres"]];
const RES5: [string, string, string][] = [["women", "Women Entrepreneurs Resource Centre", "women-entrepreneurs"], ["lgbtq", "LGBTQ+ Entrepreneurs Resource Centre", "lgbtq"], ["black", "Black Entrepreneurs Resource Centre", "black-entrepreneurs"], ["immigrant", "Immigrant Entrepreneurs Resource Centre", "immigrant-entrepreneurs"], ["indigenous", "Indigenous Entrepreneurs Resource Centre", "indigenous-entrepreneurs"]];
const RESBLURB: Record<string, string> = {
  women: "A platform committed to uplifting and expanding the presence of women-owned businesses across Canada, supported by CanadianSME Small Business Magazine.",
  lgbtq: "A platform created to support and amplify the growth of LGBTQ+-owned businesses across Canada, powered by CanadianSME Small Business Magazine.",
  black: "A platform dedicated to empowering and growing Black-owned businesses across Canada, powered by CanadianSME Small Business Magazine.",
  immigrant: "A platform committed to helping businesses owned by immigrants in Canada grow, supported by CanadianSME Small Business Magazine.",
  indigenous: "A one-stop hub for building and growing Indigenous businesses in Canada, powered by CanadianSME Small Business Magazine.",
};

const Sec = ({ id, eyebrow, title, sub }: { id: string; eyebrow?: string; title: string; sub?: string }) => (
  <div className="abcenter" id={`ab-${id}`}>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{sub && <p>{sub}</p>}</div>
);

function Split({ rev, img, title, text, href, label, alt }: { rev?: boolean; img: string; title: string; text: string; href: string; label: string; alt: string }) {
  return (
    <section className={`card split absec${rev ? " rev" : ""}`}>
      <div className="abimg"><img src={`/zip/img/${img}.jpg`} alt={alt} loading="lazy" /></div>
      <div className="stack" style={{ gap: 10 }}>
        <h2>{title}</h2><p>{text}</p>
        <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href={href} prefetch={href === "/pavilion" || href === "/matches" ? false : undefined}>{label}</Link>
      </div>
    </section>
  );
}

export async function ZipAbout() {
  const { supabase, userId } = await getViewer();
  const { count } = await supabase.from("groups").select("id", { count: "exact", head: true }).eq("is_private", false);
  const groups = count || 12;
  const join = userId ? <Link className="btn w" href="/feed">Go to the feed</Link> : <Link className="btn w" href="/auth/sign-up">Join free</Link>;
  const join2 = userId ? <Link className="btn" href="/feed">Go to the feed</Link> : <Link className="btn" href="/auth/sign-up">Join free</Link>;
  const pillars: [string, string, string, string, string, string][] = [
    ["#D42A2A", "book", "The magazine", "A monthly digital magazine with expert articles, case studies and interviews with business leaders. Each edition has a theme, from banking and finance to cybersecurity.", "/magazine", "Read the magazine"],
    ["#2563EB", "msg", "The podcast", "The Small Business Podcast: practical conversations with founders and experts you can act on the same week.", "/podcast", "Listen to the podcast"],
    ["#17552F", "cal", "The events", "The Small Business Show each May, the Small Business Summit each October, and the Canada Business Talks series through the year.", "/events", "See what is coming up"],
    ["#6B4300", "crown", "The awards", "The CanadianSME National Small Business Awards celebrate the owners who drive innovation and growth in their communities.", "/news", "Read about the winners"],
  ];
  return (
    <Wrap wide>
      <section className="abh" aria-label="About SMB Hub">
        <img src="/zip/img/community.jpg" alt="" />
        <div className="in">
          <p className="eyebrow">About us · From CanadianSME Small Business Magazine</p>
          <h1>Welcome to the CanadianSME Small Business Hub</h1>
          <p>A lasting business takes more than a good idea. Since 2018 CanadianSME has told the stories of Canadian owners. The Hub is where those owners meet, ask, answer and grow together.</p>
          <div className="row" style={{ flexWrap: "wrap" }}>{join}<a className="btn o" href="#ab-story">Read our story</a></div>
        </div>
      </section>
      <nav className="abnav" aria-label="On this page">{NAV.map(([id, l]) => <a key={id} className="chip" href={`#ab-${id}`}>{l}</a>)}</nav>
      <section className="quote2">
        <blockquote>Small business support <span>you can trust.</span></blockquote>
        <p>CanadianSME was created out of admiration for entrepreneurs. Small and medium-sized businesses carry a large share of Canada’s economy, and the people who run them deserve a support system built for them. Our mission is to give Canadian owners the resources, the knowledge and the connections they need to thrive.</p>
      </section>
      <Sec id="story" eyebrow="Our story" title="From one magazine to a national community" />
      <div className="tline">
        <div><b>2018</b><strong>The magazine begins</strong><span>CanadianSME Small Business Magazine launches as a digital publication for Canadian owners.</span></div>
        <div><b>2019</b><strong>The first awards</strong><span>The CanadianSME Small Business Awards start recognising owners across the country.</span></div>
        <div><b>2020</b><strong>The first summit</strong><span>The Small Business Summit brings owners and experts together each October.</span></div>
        <div><b>2022</b><strong>The idea for a Hub</strong><span>Planning starts for a place where readers can talk to each other, not only read.</span></div>
        <div className="next"><b>2027</b><strong>The new Hub opens</strong><span>A rebuilt Small Business Hub with groups, advisors, matchmaking and AI tools.</span></div>
      </div>
      <Sec id="what" eyebrow="What CanadianSME does" title="Four ways we back Canadian owners" sub="Everything we publish and host feeds the Hub, so members get it in one place." />
      <div className="pillars">
        {pillars.map(([c, ic, t, d, h, l]) => (
          <Link key={t} className="card" href={h}>
            <span className="ico" style={{ background: c }}><Ic n={ic as "book"} s={22} /></span>
            <h3>{t}</h3><p className="muted small" style={{ lineHeight: 1.6 }}>{d}</p><span className="go">{l} →</span>
          </Link>
        ))}
      </div>
      <Sec id="hub" eyebrow="Inside the Hub" title="A community, not just a website" />
      <Split img="advisors" title="Connect with small business advisors" text="The Small Business Hub is a nationwide platform where business owners get expert advice and practical insight from advisors who work with small businesses every day. Book a free intro call or ask a question in the open." href="/smb-advisor" label="Meet the advisors" alt="Two business people shaking hands across a desk" />
      <Split rev img="hero" title="A Canadian small business community" text="A place where entrepreneurs connect, talk openly about their challenges and learn from one another. Twelve focused groups cover money, marketing, hiring, trades, food, retail and more." href="/groups" label="Browse the groups" alt="Two colleagues smiling at a laptop in a bright office" />
      <Split img="network" title="Network and collaborate" text="We connect entrepreneurs with the advice and the contacts they need to build stronger foundations. Tell the Hub what you need, and AI matchmaking introduces you to a member who can help." href="/matches" label="Try AI matchmaking" alt="A shop owner working on a laptop in her clothing store" />
      <section className="abwide absec">
        <div className="stack" style={{ gap: 12 }}>
          <p className="eyebrow" style={{ color: "#FCA5A5" }}>Who we are</p>
          <h2>Powered by CanadianSME Magazine</h2>
          <p>CanadianSME is one of Canada’s leading platforms for small and medium-sized businesses, with a focus on innovation, growth and marketing. The Hub is run by the same team, from Mississauga, Ontario.</p>
          <ul><li>Published monthly, online, since 2018</li><li>Interviews with founders, bankers, advisors and policy makers</li><li>Member posts and wins featured in the magazine</li></ul>
          <div className="row" style={{ flexWrap: "wrap" }}><Link className="btn" href="/magazine">Subscribe now</Link></div>
        </div>
        <div className="abimg" style={{ background: "#fff" }}><img src="/zip/img/who.jpg" alt="Cover of CanadianSME Small Business Magazine" style={{ objectFit: "contain", aspectRatio: "4/4.4" }} /></div>
      </section>
      <Sec id="year" eyebrow="A year with us" title="There is always something on" />
      <div className="year">
        <div><span className="when">Every week</span><strong>On the Hub</strong><span className="muted small">Monday question, Wednesday live session with an expert, Friday member wins.</span></div>
        <div><span className="when">Every month</span><strong>A new magazine edition</strong><span className="muted small">One theme, explored through articles and interviews.</span></div>
        <div><span className="when">May</span><strong>Small Business Show</strong><span className="muted small">Meet suppliers, partners and other owners in person.</span></div>
        <div><span className="when">October</span><strong>Small Business Summit</strong><span className="muted small">Our flagship conference, held during Small Business Month.</span></div>
        <div><span className="when">Through the year</span><strong>Canada Business Talks</strong><span className="muted small">Focused sessions on the issues owners are facing right now.</span></div>
        <div><span className="when">Annually</span><strong>National Small Business Awards</strong><span className="muted small">Nominate a business, or enter your own.</span></div>
      </div>
      <div className="abstats absec">
        <div><b>2018</b><span>CanadianSME founded</span></div>
        <div><b>13</b><span>provinces and territories with a business guide</span></div>
        <div><b>{groups}</b><span>member groups</span></div>
        <div><b>5</b><span>inclusive resource centres</span></div>
      </div>
      <section className="card split absec">
        <div className="abimg tall"><img src="/zip/img/support.jpg" alt="A smiling team standing in front of a planning wall" loading="lazy" /></div>
        <div className="stack" style={{ gap: 10 }}>
          <h2>Get the support to start and scale your small business</h2>
          <p>The Hub is an ecosystem built for growing small businesses and startups in Canada. Whether you opened last month or twenty years ago, you will find owners a few steps ahead of you who are glad to share what worked.</p>
          <div>{join2}</div>
        </div>
      </section>
      <Sec id="benefits" title="What members get" sub="Eight reasons owners join." />
      <div className="ben2">
        {BEN.map(([t, d, h, ic, c, g], i) => (
          <Link key={t} href={h} prefetch={h === "/ask" || h === "/pavilion" ? false : undefined} style={{ "--c": c } as React.CSSProperties}>
            <span className="bn" aria-hidden="true">0{i + 1}</span>
            <span className="bi"><Ic n={ic as "users"} s={24} /></span>
            <span><strong>{t}</strong><span className="bt">{d}</span><span className="bg">{g} →</span></span>
          </Link>
        ))}
      </div>
      <Sec id="resources" title="Embracing diversity: an inclusive resource hub" sub="We support entrepreneurs from every background. Each resource centre brings together guides, mentorship, networking and funding information." />
      <div className="grid">
        {RES5.map(([k, t, slug]) => (
          <div key={k} className="card">
            <div className="cover photo"><img src={`/zip/img/${k}.jpg`} alt="" loading="lazy" /></div>
            <h2 style={{ fontSize: 16 }}>{t}</h2>
            <p className="muted small" style={{ flex: 1 }}>{RESBLURB[k]}</p>
            <Link className="btn sm ghost" style={{ alignSelf: "flex-start" }} href={`/resources/${slug}`}>Learn more</Link>
          </div>
        ))}
      </div>
      <Sec id="family" eyebrow="The CanadianSME family" title="Our sister publications" />
      <div className="family"><span>She &amp; Success Business Magazine</span><span>Black Business Magazine</span><span>Indigenous SME Business Magazine</span><span>B2B Market Insights Magazine</span></div>
      <div className="band abband">
        <div className="stack grow" style={{ flexBasis: 380, gap: 6 }}><h2 style={{ fontSize: 20 }}>Membership options</h2><p>Plans for startups and established businesses alike. Connect with other owners and trade experience, tools and advice, from financing to expansion.</p></div>
        <Link className="btn light" href="/membership-plans">Get started</Link>
      </div>
    </Wrap>
  );
}
