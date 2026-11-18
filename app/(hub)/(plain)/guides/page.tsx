import Link from "next/link";
import { GUIDES } from "@/lib/content";
import { Hero } from "@/components/content";

export const metadata = { title: "Business guides by province" };

export default function GuidesPage() {
  return (
    <>
      <Hero title="Business guides by province" text="What each province and territory is known for, and the organisations there that fund, advise and connect small businesses." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="panel group block h-full p-4 transition-colors hover:border-primary/40">
              <h2 className="text-base font-semibold group-hover:text-primary group-hover:underline">{g.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{g.sectors.slice(0, 4).join(", ")}</p>
              <p className="mt-2 text-xs font-semibold text-primary">{g.orgs.length} organisations</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
