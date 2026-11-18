import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { GUIDES } from "@/lib/content";
import { Chips, Hero, LinkList, OrgList } from "@/components/content";

export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));
const find = (slug: string) => GUIDES.find((g) => g.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = find((await params).slug);
  return { title: g && `${g.name} business guide` };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = find(slug);
  if (!guide) notFound();
  return (
    <>
      <Hero title={`Doing business in ${guide.name}`} text={guide.summary} back={{ href: "/guides", label: "All business guides" }} />
      <section className="panel grid gap-5 p-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-base font-semibold">Main industries</h2>
          <Chips items={guide.sectors} />
        </div>
        <div>
          <h2 className="mb-2 text-base font-semibold">Why set up here</h2>
          <ul className="space-y-1.5 text-sm">
            {guide.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <OrgList title={`Where to get help in ${guide.name}`} orgs={guide.orgs} />
      <LinkList title="Other provinces and territories" items={GUIDES.filter((g) => g.slug !== slug).map((g) => ({ label: g.name, href: `/guides/${g.slug}` }))} />
    </>
  );
}
