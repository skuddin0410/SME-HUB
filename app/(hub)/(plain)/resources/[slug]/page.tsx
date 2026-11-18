import { notFound } from "next/navigation";
import { RESOURCE_PAGES } from "@/lib/content";
import { Chips, Hero, LinkList, OrgList } from "@/components/content";

export const generateStaticParams = () => RESOURCE_PAGES.map((p) => ({ slug: p.slug }));
const find = (slug: string) => RESOURCE_PAGES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: find((await params).slug)?.title };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = find(slug);
  if (!page) notFound();
  return (
    <>
      <Hero title={page.title} text={page.intro}>
        <div className="mt-4">
          <Chips items={page.offers} onDark />
        </div>
      </Hero>
      <OrgList title="Organisations that can help" orgs={page.orgs} />
      <LinkList title="More resources for founders" items={RESOURCE_PAGES.filter((p) => p.slug !== slug).map((p) => ({ label: p.label, href: `/resources/${p.slug}` }))} />
    </>
  );
}
