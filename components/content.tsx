import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ChevronRight, Headphones } from "lucide-react";
import { SECTIONS, type Org, type SectionKey } from "@/lib/content";
import { Thumb } from "@/components/hub-client";

/** Blue banner that opens a reference page. */
export function Hero({ title, text, back, children }: { title: string; text: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="cover rounded-lg p-6 text-white">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">{text}</p>
      {children}
    </div>
  );
}

export function Chips({ items, onDark = false }: { items: string[]; onDark?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li key={i} className={onDark ? "rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold" : "rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"}>
          {i}
        </li>
      ))}
    </ul>
  );
}

const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");

/** Outside organisations. Each row opens that organisation's own website in a new tab. */
export function OrgList({ title, orgs }: { title: string; orgs: Org[] }) {
  return (
    <section className="panel">
      <h2 className="px-4 pt-4 text-base font-semibold">{title}</h2>
      <p className="px-4 text-xs text-muted-foreground">Each one opens the organisation&apos;s own website in a new tab.</p>
      <ul className="mt-2 divide-y">
        {orgs.map((o) => (
          <li key={o.name}>
            <a href={o.url} target="_blank" rel="noreferrer" className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {o.name.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold group-hover:text-primary group-hover:underline">{o.name}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{o.about}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{host(o.url)}</span>
              </span>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A list of links to other pages on this site, used for "more guides" style blocks. */
export function LinkList({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <ul className="mt-2 grid gap-x-4 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors hover:bg-primary/5 hover:text-primary">
              {i.label}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StoryIndex({ section }: { section: SectionKey }) {
  const s = SECTIONS[section];
  const [lead, ...rest] = s.items;
  return (
    <>
      <Hero title={s.name} text={s.intro} />
      <Link href={`${s.path}/${lead.slug}`} className="panel group block overflow-hidden">
        <Thumb src={lead.image} className="aspect-[16/8] w-full" />
        <div className="p-4">
          <p className="text-xs font-semibold text-primary">Latest</p>
          <h2 className="mt-1 text-lg font-semibold leading-snug group-hover:text-primary group-hover:underline">{lead.title}</h2>
        </div>
      </Link>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((item) => (
          <li key={item.slug}>
            <Link href={`${s.path}/${item.slug}`} className="panel group flex h-full flex-col overflow-hidden">
              <Thumb src={item.image} className="aspect-[16/9] w-full" />
              <h2 className="p-3 text-sm font-semibold leading-snug group-hover:text-primary group-hover:underline">{item.title}</h2>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StoryPage({ section, slug }: { section: SectionKey; slug: string }) {
  const s = SECTIONS[section];
  const story = s.items.find((i) => i.slug === slug);
  if (!story) notFound();
  const more = s.items.filter((i) => i.slug !== slug).slice(0, 4);
  return (
    <>
      <article className="panel overflow-hidden">
        <Thumb src={story.image} className="aspect-[16/8] w-full" />
        <div className="p-5">
          <Link href={s.path} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            {s.name}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">{story.title}</h1>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            {section === "podcast" && <Headphones className="mt-0.5 h-4 w-4 shrink-0" />}
            {section === "podcast" ? "The recording for this episode has not been added here yet." : "The full text of this piece has not been added here yet."}
          </p>
          <Link href="/feed" className="press mt-4 inline-flex rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
            Talk about it in the feed
          </Link>
        </div>
      </article>
      <section className="panel p-4">
        <h2 className="text-base font-semibold">More from {s.name}</h2>
        <ul className="mt-3 space-y-3">
          {more.map((m) => (
            <li key={m.slug}>
              <Link href={`${s.path}/${m.slug}`} className="group flex items-center gap-3">
                <Thumb src={m.image} className="h-12 w-16 shrink-0 rounded" />
                <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary group-hover:underline">{m.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
