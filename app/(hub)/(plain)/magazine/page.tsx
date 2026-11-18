/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { MAGAZINE } from "@/lib/content";
import { Hero } from "@/components/content";

export const metadata = { title: "CanadianSME Magazine" };

export default function MagazinePage() {
  return (
    <>
      <Hero title="CanadianSME Small Business Magazine" text="The magazine behind SMB Hub. Each issue covers growth, innovation and marketing for Canadian small and medium businesses." />
      <section className="panel p-4">
        <div className="flex items-center gap-4">
          <img src={MAGAZINE.cover} alt={`Cover of the ${MAGAZINE.issue} issue`} className="h-28 w-20 shrink-0 rounded object-cover shadow-md" />
          <div>
            <p className="text-xs font-semibold text-primary">Latest issue</p>
            <h2 className="text-lg font-semibold">{MAGAZINE.issue}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Read it below. Use the full-screen button in the reader for a larger page.</p>
          </div>
        </div>
        <iframe src={MAGAZINE.reader} title={`CanadianSME Small Business Magazine, ${MAGAZINE.issue}`} allowFullScreen loading="lazy" className="mt-4 aspect-[4/3] w-full rounded-lg border bg-muted" />
      </section>
      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-base font-semibold">More to read and hear</h2>
          <p className="text-sm text-muted-foreground">Articles, business news and the podcast, all on SMB Hub.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[["Blog", "/blog"], ["News", "/news"], ["Podcast", "/podcast"]].map(([label, href]) => (
            <Link key={href} href={href} className="press rounded-full border border-primary px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
