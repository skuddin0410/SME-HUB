"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Crown, Mail } from "lucide-react";
import { ABOUT_MENU, CONTACT, EXPLORE_MENU, POLICY_MENU, PROVINCE_MENU, RESOURCES_MENU, type NavItem } from "@/lib/site";

/** The header menu group each reading page belongs to, so the side card lists its neighbours. */
const GROUPS: { title: string; items: NavItem[]; match: (p: string) => boolean }[] = [
  { title: "SMB resources", items: RESOURCES_MENU, match: (p) => p.startsWith("/resources") },
  { title: "Province-wide resources", items: PROVINCE_MENU, match: (p) => p.startsWith("/guides/") },
  { title: "Policies & help", items: POLICY_MENU, match: (p) => p.startsWith("/policies") || p.startsWith("/help") },
  { title: "About SMB Hub", items: ABOUT_MENU, match: (p) => ["/about", "/magazine", "/contact", "/guides"].includes(p) },
  { title: "Explore the Hub", items: EXPLORE_MENU, match: () => true },
];

const isActive = (href: string, path: string) => path === href || (href !== "/" && path.startsWith(href + "/"));

/** Right-hand column on reading pages: the pages next to this one, a contact card and the plans. */
export function SectionAside() {
  const path = usePathname();
  const group = GROUPS.find((g) => g.match(path))!;
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={group.title} className="rounded-3xl border border-[#E5E5E8] bg-white p-4 shadow-card">
        <p className="px-2 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">In this section</p>
        <h2 className="px-2 pb-2 font-display text-[15px] font-bold text-zinc-950">{group.title}</h2>
        <ul className="grid gap-0.5">
          {group.items.map((i) => {
            const on = isActive(i.href, path);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
                    on ? "bg-[#18181B] font-semibold text-white" : "text-zinc-800 hover:bg-[#F5F5F6] hover:text-zinc-950"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? "bg-rose-500" : "bg-zinc-300"}`} />
                  <span className="truncate">{i.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section className="rounded-3xl border border-[#E5E5E8] bg-white p-5 shadow-card">
        <h2 className="font-display text-[14px] font-bold text-zinc-950">Questions?</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-500">The CanadianSME team answers every message, usually within one business day.</p>
        <a href={`mailto:${CONTACT.emails[0]}`} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-blue-600 hover:underline">
          <Mail className="h-3.5 w-3.5" />
          {CONTACT.emails[0]}
        </a>
        <Link href="/contact" className="mt-1.5 flex items-center gap-1 text-[12.5px] font-semibold text-zinc-800 hover:text-zinc-950">
          All contact details <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {path !== "/membership-plans" && (
        <Link href="/membership-plans" className="group rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-card transition-colors hover:border-amber-300">
          <span className="flex items-center gap-1.5 font-display text-[14px] font-bold text-amber-900">
            <Crown className="h-4 w-4 text-amber-600" /> Grow with a plan
          </span>
          <span className="mt-1 block text-[12.5px] leading-relaxed text-amber-900/75">Company pages, more connections and featured offers for your business.</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-amber-900 group-hover:underline">
            Compare plans <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}
