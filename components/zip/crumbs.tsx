import Link from "next/link";

/** One step of a breadcrumb: its label, and a link when the step is a page you can go back to. */
export type Crumb = [label: React.ReactNode, href?: string];

/**
 * The breadcrumb above a page title (Home › Section › This page). It replaces the small label that used to sit
 * above titles. `note` adds a short fact after the trail, such as "Only you can see this page"; `lock` adds a lock icon to it.
 */
export function Crumbs({ items, note, lock }: { items: Crumb[]; note?: React.ReactNode; lock?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className="pgcrumbs">
      <ol>
        <li><Link href="/">Home</Link></li>
        {items.map(([label, href], i) => (
          <li key={i}>
            {i === items.length - 1 ? <span aria-current="page">{label}</span> : href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
          </li>
        ))}
      </ol>
      {note ? (
        <span className="crnote">
          {lock && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {note}
        </span>
      ) : null}
    </nav>
  );
}
