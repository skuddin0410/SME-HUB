import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AvatarImg } from "@/components/hub-client";
import { withParams } from "@/lib/cms-format";

// Building blocks for CMS pages: dense, neutral, built for scanning lists and acting on rows.

export const TABLE = "w-full text-left text-[0.875rem]";
export const TH = "px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-50/80 border-b border-zinc-200 whitespace-nowrap";
export const TD = "px-4 py-3 align-middle border-b border-zinc-100";
export const INPUT = "h-9 rounded-lg border border-zinc-300 bg-white px-3 text-[0.875rem] text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15";
export const SELECT = `${INPUT} pr-8`;
export const BTN = "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.875rem] font-semibold transition-colors disabled:opacity-50";
export const BTN_PRIMARY = `${BTN} bg-zinc-900 text-white hover:bg-zinc-800`;
export const BTN_OUTLINE = `${BTN} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50`;
export const BTN_DANGER = `${BTN} border border-rose-200 bg-white text-rose-700 hover:bg-rose-50`;

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-jakarta text-[1.4688rem] font-extrabold tracking-tight text-zinc-950">{title}</h1>
        {description && <p className="mt-0.5 text-[0.875rem] text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className = "",
  flush = false,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** no inner padding, for tables */
  flush?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_0.125rem_rgba(24,24,27,0.04)] ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          {title && <h2 className="text-[0.9062rem] font-bold text-zinc-900">{title}</h2>}
          {actions}
        </header>
      )}
      <div className={flush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, href, tone = "zinc" }: { label: string; value: number | string; hint?: string; href?: string; tone?: "zinc" | "rose" | "amber" }) {
  const inner = (
    <>
      <p className="text-[0.8125rem] font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 font-jakarta text-[1.5938rem] font-extrabold tabular-nums ${tone === "rose" ? "text-rose-600" : tone === "amber" ? "text-amber-600" : "text-zinc-950"}`}>
        {typeof value === "number" ? value.toLocaleString("en-CA") : value}
      </p>
      {hint && <p className="mt-0.5 text-[0.7812rem] text-zinc-500">{hint}</p>}
    </>
  );
  const cls = "block rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_0.125rem_rgba(24,24,27,0.04)]";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-zinc-300 hover:bg-zinc-50/60`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

const TONES = {
  zinc: "bg-zinc-100 text-zinc-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-700",
  violet: "bg-violet-50 text-violet-700",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "zinc", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${TONES[tone]}`}>{children}</span>;
}

export const PLAN_TONE: Record<string, Tone> = { owner: "zinc", plus: "blue", elite: "violet", advisor: "amber" };

export function Person({
  person,
  sub,
  size = 32,
}: {
  person: { id: string; full_name: string; avatar_url: string | null } | null | undefined;
  sub?: React.ReactNode;
  size?: number;
}) {
  if (!person) return <span className="text-zinc-400">Deleted member</span>;
  return (
    <Link href={`/cms/members/${person.id}`} className="group flex min-w-0 items-center gap-2.5">
      <AvatarImg person={person} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-zinc-900 group-hover:underline">{person.full_name || "Member"}</span>
        {sub && <span className="block truncate text-[0.8125rem] text-zinc-500">{sub}</span>}
      </span>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-[0.875rem] text-zinc-500">{children}</p>;
}

/** Previous / next with "showing x–y of z" when the total is known. */
export function Pager({
  page,
  size,
  shown,
  total,
  path,
  params = {},
}: {
  page: number;
  size: number;
  shown: number;
  total?: number | null;
  path: string;
  params?: Record<string, string | undefined>;
}) {
  const hasMore = total != null ? page * size < total : shown === size;
  if (page === 1 && !hasMore) {
    return total != null && total > 0 ? <p className="px-1 text-[0.8125rem] text-zinc-500">{total.toLocaleString("en-CA")} total</p> : null;
  }
  const from = (page - 1) * size + (shown ? 1 : 0);
  const to = (page - 1) * size + shown;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 px-1 text-[0.8438rem] text-zinc-600">
      <span>
        {from}–{to}
        {total != null ? ` of ${total.toLocaleString("en-CA")}` : ""}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link href={withParams(path, { ...params, page: page - 1 })} className={BTN_OUTLINE}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : null}
        {hasMore ? (
          <Link href={withParams(path, { ...params, page: page + 1 })} className={BTN_OUTLINE}>
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

/** A GET form for list filters; its fields become the query string. */
export function Filters({ children, reset }: { children: React.ReactNode; reset?: string }) {
  return (
    <form className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
      {children}
      <button type="submit" className={BTN_PRIMARY}>
        Apply
      </button>
      {reset && (
        <Link href={reset} className="px-2 text-[0.8438rem] font-medium text-zinc-500 hover:text-zinc-900">
          Clear
        </Link>
      )}
    </form>
  );
}

/** Small "label: value" rows for detail pages. */
export function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(6.875rem,auto)_1fr] gap-x-4 gap-y-2 text-[0.875rem]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="min-w-0 break-words text-zinc-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
