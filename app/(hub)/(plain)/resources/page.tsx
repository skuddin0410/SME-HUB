import Link from "next/link";
import { RESOURCE_PAGES } from "@/lib/content";
import { Hero } from "@/components/content";
import { findFull } from "@/lib/smehub";

export const metadata = { title: "Resources for founders" };

export default function ResourcesPage() {
  return (
    <>
      <Hero title="Resources for founders" text="Funding, mentors and networks for the communities that build Canadian small business." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RESOURCE_PAGES.map((p) => (
          <li key={p.slug}>
            <Link href={`/resources/${p.slug}`} className="panel group block h-full p-4 transition-colors hover:border-primary/40">
              <h2 className="text-base font-semibold group-hover:text-primary group-hover:underline">{p.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.intro}</p>
              <p className="mt-2 text-xs font-semibold text-primary">{findFull(`/resources/${p.slug}`)?.orgs.length ?? p.orgs.length} organisations</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
