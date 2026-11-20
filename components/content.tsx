import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Headphones } from "lucide-react";
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
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#E5E5E8] bg-white p-6 sm:p-8 shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/smb-hub-mark.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 w-48 opacity-[0.06] select-none" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-600 via-red-500 to-blue-600" />
      {back && (
        <Link href={back.href} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      {eyebrow && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E5E5E8] bg-[#F7F7F8] px-3 py-1 text-[11.5px] font-semibold text-zinc-800">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
          {eyebrow}
        </p>
      )}
      <h1 className="relative max-w-3xl font-jakarta text-[28px] font-extrabold leading-[1.12] tracking-tight text-zinc-950 sm:text-[34px]">{title}</h1>
      <p className="relative mt-3 max-w-2xl text-[14.5px] leading-relaxed text-zinc-600">{text}</p>
      {children && <div className="relative mt-5">{children}</div>}
    </section>
  );
}

/** A list of links to other pages on this site, used for "more guides" style blocks. */
export function LinkList({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <section className="rounded-3xl border border-[#E5E5E8] bg-white p-5 shadow-card">
      <h2 className="font-display text-[15px] font-bold text-zinc-950">{title}</h2>
      <ul className="mt-3 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="group flex items-center justify-between rounded-xl px-3 py-2 text-[13px] text-zinc-800 transition-colors hover:bg-[#F5F5F6] hover:text-zinc-950">
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
