/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Facebook, Instagram, Linkedin, Plus, Twitter } from "lucide-react";
import type { FullPage, Org } from "@/lib/smehub";

// The resource-centre and business-guide pages from smehub.ca, with the same content, laid out in the
// hub's design: a white hero card, the key points as accordions, then one card per organisation,
// with the other pages of the same menu group in a sticky side card.

const ICONS = { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin };
const CARD = "rounded-3xl border border-[#E5E5E8] bg-white shadow-card";

function Accordion({ items, group }: { items: [string, string][]; group: string }) {
  return (
    <div className={`${CARD} divide-y divide-[#F0F0F2] overflow-hidden`}>
      {items.map(([title, body], i) => (
        // same `name` = only one open per column; the first starts open
        <details key={title} name={group} open={i === 0} className="group">
          <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-4 text-[0.9375rem] font-semibold leading-snug text-zinc-900 hover:bg-[#FAFAFA] [&::-webkit-details-marker]:hidden">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F5F5F6] text-zinc-500 transition-transform group-open:rotate-45 group-open:bg-blue-50 group-open:text-blue-600">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </span>
            {title}
          </summary>
          <p className="whitespace-pre-line px-5 pb-5 pl-[3.25rem] text-[0.875rem] leading-relaxed text-zinc-600">{body}</p>
        </details>
      ))}
    </div>
  );
}

function OrgCard({ org }: { org: Org }) {
  return (
    <article className={`${CARD} flex flex-col gap-5 p-5 sm:flex-row`}>
      <div className="flex h-[8.25rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#F0F0F2] bg-[#FAFAFA] sm:w-[11.25rem]">
        <img src={org.logo} alt={`${org.name} logo`} loading="lazy" className="max-h-full max-w-full object-contain p-3" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-display text-[1.0625rem] font-bold leading-snug text-zinc-950">{org.name}</h3>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-zinc-600">{org.text}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <ul className="flex gap-1.5">
            {org.socials.map((s) => {
              const Icon = ICONS[s.kind];
              return (
                <li key={s.kind}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${org.name} on ${s.kind}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E8] text-zinc-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ul>
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[0.8438rem] font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Visit website <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function SmehubPage({ page }: { page: FullPage }) {
  const [first, second] = page.heads;
  const guide = page.path.startsWith("/guides/");
  return (
    <div className="flex-1 hubw py-6">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <main className="flex min-w-0 flex-col gap-5 w-full lg:col-span-12">
          <section className={`${CARD} relative grid items-center gap-6 overflow-hidden p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_15rem]`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-600 via-red-500 to-blue-600" />
            <div>
              <Link href={guide ? "/guides" : "/resources"} className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900">
                <ArrowLeft className="h-3.5 w-3.5" />
                {guide ? "All province guides" : "All SMB resources"}
              </Link>
              <p className="mb-3 flex w-fit items-center gap-2 rounded-full border border-[#E5E5E8] bg-[#F7F7F8] px-3 py-1 text-[0.7812rem] font-semibold text-zinc-800">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                {guide ? "Province-wide resources" : "SMB resources"}
              </p>
              <h1 className="font-jakarta text-[1.75rem] font-extrabold leading-[1.15] tracking-tight text-zinc-950 sm:text-[2.125rem]">{first.replace(/:$/, "")}</h1>
              {second && <p className="mt-2 font-display text-[1.0625rem] font-semibold leading-snug text-zinc-800">{second}</p>}
              <p className="mt-3 text-[0.9062rem] leading-relaxed text-zinc-600">{page.intro}</p>
            </div>
            <img src={page.img} alt="" className="h-[16.25rem] w-full rounded-2xl bg-[#F5F5F6] object-cover md:h-[18.75rem]" />
          </section>

          <section>
            <h2 className="mb-3 px-1 font-display text-[1rem] font-bold text-zinc-950">{guide ? "What to know before you start" : "How the centre helps"}</h2>
            <div className="grid items-start gap-4 md:grid-cols-2">
              <Accordion items={page.left} group={`${page.slug}-left`} />
              <Accordion items={page.right} group={`${page.slug}-right`} />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div className="px-1">
              <h2 className="font-display text-[1rem] font-bold text-zinc-950">Explore the best available resources for {page.band}</h2>
              <p className="mt-0.5 text-[0.8438rem] text-zinc-500">{page.orgs.length} organisations, programs and networks</p>
            </div>
            {page.orgs.map((org) => (
              <OrgCard key={org.name + org.logo} org={org} />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
