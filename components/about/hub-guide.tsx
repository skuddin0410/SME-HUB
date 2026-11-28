import Link from "next/link";
import { Ic } from "@/components/zip/ic";

// [address, label, description, icon].
type F = [string, string, string, string];
const GROUPS: [string, string, string, F[]][] = [
  ["Meet and talk to owners", "users", "#2563EB", [
    ["/feed", "Home feed", "Questions, wins, hiring posts and introductions from owners across Canada.", "home"],
    ["/network", "Members", "Find owners by industry, city or what they can help with, and connect.", "users"],
    ["/groups", "Groups", "Smaller rooms for one topic: funding, retail, importing, AI and more.", "msg"],
    ["/matches", "AI matchmaking", "3 people worth meeting every day, picked from your profile.", "spark"],
    ["/events", "Events", "Online and in-person events for small business owners.", "cal"]]],
  ["Get found and grow", "store", "#16A34A", [
    ["/businesses", "Business Directory", "A free page for your business, searchable across Canada.", "store"],
    ["/categories", "All categories", "32 industries and 335 specialities, so customers find the right business.", "grid"],
    ["/pavilion", "Made in Canada Pavilion", "A showcase for products made by Canadian businesses.", "flag"],
    ["/for-sale", "Business for sale", "Buy or sell a small business, with the seller’s name hidden if they like.", "tag"],
    ["/jobs", "Jobs", "Find work at Canadian small businesses, or post a job of your own.", "brief"],
    ["/member-blogs", "Member blogs", "Write about what you know and reach other owners.", "edit"]]],
  ["Funding, tools and advice", "coin", "#C37D16", [
    ["/grants", "Grant Finder", "Grants, loans and tax credits matched to your business, with checked sources.", "coin"],
    ["/tools", "Business tools", "Calculators for GST/HST, cash flow, loans, landed cost and pricing.", "calc"],
    ["/deadlines", "My deadlines", "Your CRA dates and your own deadlines, with reminders.", "clock"],
    ["/ask", "Ask Maple", "Maple, the AI assistant: answers, people and tools in one place.", "help"],
    ["/smb-advisor", "SME Advisors", "Accountants, lawyers and consultants who work with small businesses.", "brief"]]],
  ["Learn", "book", "#7C3AED", [
    ["/guides", "Province guides", "How to start and run a business in each of the 13 provinces and territories.", "pin"],
    ["/resources", "Resource centres", "Support for women, Black, Indigenous, immigrant and 2SLGBTQI+ entrepreneurs.", "hand"],
    ["/courses", "Courses", "Short courses from owners and experts.", "cap"],
    ["/news", "News and blog", "Small business news and how-to articles, every week.", "doc"],
    ["/podcast", "Small Business Podcast", "Founders and experts on the problems owners face.", "play"]]],
];
const STEPS = [["Join free", "Sign up in a minute. No card needed."], ["Set up your profile", "Add your business, your city and what you can help with."], ["Connect", "Start with 3 owners you already know, then meet new ones."], ["Post and list", "Ask a question, share a win and add your business to the directory."]];
const FAQS = [
  ["Is SME Hub really free?", "Yes. Every owner gets a full free membership with no time limit. Paid plans only add extra reach."],
  ["Who can join?", "Small business owners, founders and self-employed people in Canada, plus the advisors and suppliers who serve them."],
  ["Who runs SME Hub?", "Cmarketing Inc., the company behind CanadianSME Small Business Magazine, the Small Business Show, the Small Business Summit and the Small Business Awards."],
  ["Will you sell my data or spam me?", "No. You choose who sees your details, and you control which emails you get."],
  ["How do I get help?", "See Help for quick answers, or email support@smehub.ca. The team replies within one business day."],
];

/** Update 23: How SME Hub works (replaces the CanadianSME Magazine page). */
export function HubGuide({ member }: { member: boolean }) {
  return (
    <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="xhg">
        <nav className="crumbs small" aria-label="Breadcrumb"><Link href="/feed">Home</Link> / How SME Hub works</nav>
        <section className="xhghero">
          <p className="pgkick2">About SME Hub</p>
          <h1>How SME Hub works</h1>
          <p>SME Hub is Canada’s free small business network. One place to meet other owners, get your business found, find funding and deadlines, and learn from people who have been where you are.</p>
          <div className="xhgcta">{member ? <Link className="btn" href="/feed">Go to your feed</Link> : <Link className="btn" href="/auth/sign-up">Join free</Link>}<Link className="btn ghost" href="/membership-plans">See membership plans</Link></div>
        </section>
        <div className="xhgnums"><div><b>Free</b><span>for every owner, no time limit</span></div><div><b>32</b><span>industries, 335 specialities</span></div><div><b>13</b><span>province and territory guides</span></div><div><b>5</b><span>community resource centres</span></div></div>
        <section className="xhgsec">
          <div className="xhghead"><p className="pgkick2">Getting started</p><h2>Up and running in four steps</h2></div>
          <ol className="xhgsteps">{STEPS.map((s, n) => <li key={s[0]}><span className="xhgn">{n + 1}</span><b>{s[0]}</b><span>{s[1]}</span></li>)}</ol>
        </section>
        <section className="xhgsec">
          <div className="xhghead"><p className="pgkick2">What you can do</p><h2>Everything on SME Hub</h2></div>
          <div className="xhggroups">
            {GROUPS.map((g) => (
              <div key={g[0]} className="xhggrp" style={{ "--hg": g[2] } as React.CSSProperties}>
                <h3><span><Ic n={g[1]} s={18} /></span>{g[0]}</h3>
                {g[3].map((f) => <Link key={f[1]} className="xhgf" href={f[0]}><span className="xhgfi"><Ic n={f[3]} s={18} /></span><span className="xhgft"><b>{f[1]}</b><small>{f[2]}</small></span><Ic n="right" s={14} /></Link>)}
              </div>
            ))}
          </div>
        </section>
        <section className="xhgsec">
          <div className="xhghead"><p className="pgkick2">Membership</p><h2>Free to join. Upgrade only if it pays for itself.</h2></div>
          <div className="xhgplans">
            <div><b>Free</b><p className="xhgamt">$0</p><p>Profile, connections and messages, one directory listing, groups, posting, Grant Finder and 3 people to meet every day.</p></div>
            <div className="hot"><b>Plus</b><p className="xhgamt">$25 <small>a month</small></p><p>Or $240 a year. A featured listing shown first, up to 3 business pages, offers and unlimited job posts, your own private group and more AI help.</p></div>
            <div><b>Advisor</b><p className="xhgamt">$1,990 <small>a year</small></p><p>For accountants, lawyers, consultants and coaches. An SME Advisor badge, a place on the Advisors page and free intro calls booked by members.</p></div>
          </div>
          <Link className="xhgmore" href="/membership-plans">Compare every plan <Ic n="right" s={14} /></Link>
        </section>
        <section className="xhgsec xhgtrust">
          <div className="xhghead"><p className="pgkick2">Trust and safety</p><h2>A network owners can rely on</h2></div>
          <div className="xhgtr">
            <Link href="/policies/community-guidelines"><Ic n="shield" s={18} /><b>Community guidelines</b><span>Be helpful, be honest, no spam. Our team reviews reports quickly.</span></Link>
            <Link href="/policies/privacy-policy"><Ic n="lock" s={18} /><b>Your privacy</b><span>You decide who sees your contact details. We never sell your data.</span></Link>
            <Link href="/grants/safe"><Ic n="check" s={18} /><b>Checked information</b><span>Funding programs carry a badge when our team has checked them against the official source.</span></Link>
          </div>
        </section>
        <section className="xhgsec">
          <div className="xhghead"><p className="pgkick2">Questions</p><h2>Common questions</h2></div>
          <div className="xhgfaq">{FAQS.map((q) => <details key={q[0]}><summary>{q[0]}</summary><p>{q[1]}</p></details>)}</div>
          <Link className="xhgmore" href="/help">All questions and answers <Ic n="right" s={14} /></Link>
        </section>
        <section className="xhgend">
          <div><h2>Still have a question?</h2><p>Email support@smehub.ca or visit the contact page. We answer every message, usually within one business day.</p></div>
          <Link className="btn light" href="/contact">Contact us</Link>
        </section>
      </div>
    </div></div>
  );
}
