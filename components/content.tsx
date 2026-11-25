import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Headphones } from "lucide-react";
import { Crumbs } from "@/components/zip/crumbs";
import { SECTIONS, type SectionKey } from "@/lib/content";
import { Thumb } from "@/components/hub-client";

/**
 * Page header for reading pages: a white card in the feed's design (hairline border, 24px radius),
 * a quiet maple roundel in the corner, an optional back link and eyebrow, then the title and intro.
 */
export function Hero({
  title,
  text,
  back,
  eyebrow,
  children,
}: {
  title: string;
  text: string;
  back?: { href: string; label: string };
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  // Same header as every other page (option A): breadcrumb, title, line under it, a hairline before the content.
  // The old eyebrow label is no longer shown; the breadcrumb tells people where they are.
  void eyebrow;
  return (
    <section className="border-b border-[#E5E5E8] pb-5 mb-2">
      <Crumbs items={back ? [[back.label, back.href], [title]] : [[title]]} />
      <h1 className="max-w-3xl font-jakarta text-[1.625rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-zinc-950 sm:text-[2rem]">{title}</h1>
      <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-relaxed text-zinc-600">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

/** A list of links to other pages on this site, used for "more guides" style blocks. */
export function LinkList({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <section className="rounded-3xl border border-[#E5E5E8] bg-white p-5 shadow-card">
      <h2 className="font-display text-[1rem] font-bold text-zinc-950">{title}</h2>
      <ul className="mt-3 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group flex items-center justify-between rounded-xl px-3 py-2 text-[0.875rem] text-zinc-800 transition-colors hover:bg-[#F5F5F6] hover:text-zinc-950">
              {i.label}
              <ChevronRight className="h-4 w-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-600" />
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
          <Link href="/feed" className="press mt-4 inline-flex rounded-xl border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
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
