/* eslint-disable @next/next/no-img-element */
import { Facebook, Instagram, Linkedin, Minus, Plus, Twitter } from "lucide-react";
import type { FullPage, Org } from "@/lib/smehub";

// The resource-centre and business-guide pages, laid out as they are on smehub.ca:
// pale blue hero, two columns of accordions, a pale blue heading band, then one card per organisation.
// Measurements and colours are taken from the live pages at desktop width.

const BLUE = "#0463f1";
const ICONS = { facebook: Facebook, twitter: Twitter, instagram: Instagram, linkedin: Linkedin };

function Accordion({ items, group }: { items: [string, string][]; group: string }) {
  return (
    <div>
      {items.map(([title, body], i) => (
        // same `name` = only one open per column, like the original; the first starts open
        <details key={title} name={group} open={i === 0} className="group mb-[25px] rounded-[20px] border border-[#e5e5e5]">
          <summary className="flex cursor-pointer list-none items-start gap-1.5 px-5 py-[15px] text-[18px] font-bold leading-[30px] text-[#0a033c] [&::-webkit-details-marker]:hidden">
            <Plus strokeWidth={3.5} className="mt-[8px] h-[14px] w-[14px] shrink-0 group-open:hidden" />
            <Minus strokeWidth={3.5} className="mt-[8px] hidden h-[14px] w-[14px] shrink-0 group-open:block" />
            {title}
          </summary>
          <p className="whitespace-pre-line px-5 pb-[15px] text-[14px] leading-[27px] text-[#6c688a]">{body}</p>
        </details>
      ))}
    </div>
  );
}

function OrgCard({ org }: { org: Org }) {
  return (
    <article className="flex flex-col gap-5 rounded-[10px] border border-[#e7e6ec] bg-white p-5 sm:flex-row">
      <img src={org.logo} alt={`${org.name} logo`} loading="lazy" className="h-[180px] w-full shrink-0 rounded-[10px] bg-[#fafafa] object-contain sm:w-[260px] sm:object-cover" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-[24px] font-bold leading-[1.15] text-[#0a0606]">{org.name}</h3>
        <p className="mt-[26px] text-[14px] leading-[26px] text-[#0a0a0a]">{org.text}</p>
        <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
          <ul className="flex gap-[10px]">
            {org.socials.map((s) => {
              const Icon = ICONS[s.kind];
              return (
                <li key={s.kind}>
                  <a href={s.url} target="_blank" rel="noreferrer" aria-label={`${org.name} on ${s.kind}`} className="flex h-[33px] w-[33px] items-center justify-center rounded-full bg-[#bfdbff] transition-opacity hover:opacity-80" style={{ color: BLUE }}>
                    <Icon className="h-[15px] w-[15px]" fill={s.kind === "instagram" ? "none" : "currentColor"} strokeWidth={s.kind === "instagram" ? 2 : 0} />
                  </a>
                </li>
              );
            })}
          </ul>
          <a href={org.website} target="_blank" rel="noreferrer" className="ml-auto rounded-lg px-5 py-[10px] text-[15px] font-semibold leading-5 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: BLUE }}>
            Learn More
          </a>
        </div>
      </div>
    </article>
  );
}

export function SmehubPage({ page }: { page: FullPage }) {
  const [first, second] = page.heads;
  return (
    <main className="bg-white">
      <section className="bg-[#edf8fe] px-5 py-[60px] lg:py-[100px]">
        <div className="mx-auto grid max-w-[1120px] items-center gap-10 lg:grid-cols-[548px_minmax(0,1fr)]">
          <div>
            <h1 className="text-[28px] font-extrabold leading-[1.3] lg:text-[32px] lg:leading-[42px]" style={{ color: BLUE }}>
              {first}
            </h1>
            {second && <p className="text-[20px] font-bold leading-[1.35] text-black lg:text-[24px] lg:leading-[32px]">{second}</p>}
            <p className="mt-[10px] text-[14px] leading-[28px] text-[#0a0a0a]">{page.intro}</p>
          </div>
          <img src={page.img} alt="" className="mx-auto h-[445px] w-[343px] max-w-full rounded-[20px] object-cover" />
        </div>
      </section>

      <section className="bg-[#fafbfd] px-5 pb-[35px] pt-[60px]">
        <div className="mx-auto grid max-w-[1100px] gap-x-5 md:grid-cols-2">
          <Accordion items={page.left} group={`${page.slug}-left`} />
          <Accordion items={page.right} group={`${page.slug}-right`} />
        </div>
      </section>

      <section className="bg-[#edf8fe] px-5 py-[50px]">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="text-[24px] font-bold leading-[1.4] sm:text-[28px] sm:leading-[42px]" style={{ color: BLUE }}>
            Explore the Best Available Resources for
          </h2>
          <p className="mt-[6px] text-[24px] font-bold leading-[1.4] text-black sm:text-[28px] sm:leading-[42px]">{page.band}</p>
        </div>
      </section>

      <section className="px-5 py-[50px]">
        <div className="mx-auto flex max-w-[1140px] flex-col gap-[50px]">
          {page.orgs.map((org) => (
            <OrgCard key={org.name + org.logo} org={org} />
          ))}
        </div>
      </section>
    </main>
  );
}
