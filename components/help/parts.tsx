import Link from "next/link";
import { HIcon } from "./icons";
import { terms, snippetFor, type HelpArticle, type HelpTopic } from "@/lib/help";

/** Text with the searched words marked. */
export function Marked({ text, q }: { text: string; q?: string }) {
  const ts = q ? terms(q) : [];
  if (!ts.length) return <>{text}</>;
  const re = new RegExp(`(${ts.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}</>;
}

export function HRow({ a, q, topics }: { a: HelpArticle; q?: string; topics?: Map<string, HelpTopic> }) {
  return (
    <li>
      <Link href={`/help/a/${a.id}`}>
        <span>
          <span className="t"><Marked text={a.title} q={q} /></span>
          <span className="s">{q ? <Marked text={snippetFor(a, q)} q={q} /> : a.summary}</span>
          {q && topics?.get(a.topic) ? <span className="c">{topics.get(a.topic)!.title}</span> : null}
        </span>
        <span className="arr"><HIcon n="right" s={16} /></span>
      </Link>
    </li>
  );
}

export function HelpCard() {
  return (
    <div className="card help">
      <h3>Still need help?</h3>
      <p>Our team in Mississauga answers member questions by email and phone.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn" href="mailto:support@smehub.ca">Email support</a>
        <Link className="btn ghost" href="/help/a/contact-support">All contact options</Link>
      </div>
    </div>
  );
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((c, i) => (
        <span key={i} style={{ display: "contents" }}>
          {i > 0 ? <HIcon n="right" s={13} /> : null}
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function BigSearch({ q, placeholder, style }: { q?: string; placeholder?: string; style?: React.CSSProperties }) {
  return (
    <form className="big" role="search" action="/help/search" method="get" style={style}>
      <HIcon n="search" s={20} />
      <label className="sr" htmlFor="bq">Search help articles</label>
      <input id="bq" name="q" type="search" placeholder={placeholder} defaultValue={q} autoComplete="off" />
      <button className="btn" type="submit">Search</button>
    </form>
  );
}
