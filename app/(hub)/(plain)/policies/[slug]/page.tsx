import { notFound } from "next/navigation";
import { POLICIES } from "@/lib/content";
import { Hero, LinkList } from "@/components/content";

export const generateStaticParams = () => POLICIES.map((p) => ({ slug: p.slug }));
const find = (slug: string) => POLICIES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: find((await params).slug)?.title };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = find(slug);
  if (!policy) notFound();
  return (
    <>
      <Hero title={policy.title} text={policy.intro} />
      <article className="panel divide-y">
        {policy.sections.map((s) => (
          <section key={s.heading} className="p-5">
            <h2 className="text-base font-semibold">{s.heading}</h2>
            {s.text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>}
            {s.points && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                {s.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
      <LinkList title="Good to know" items={[...POLICIES.filter((p) => p.slug !== slug).map((p) => ({ label: p.label, href: `/policies/${p.slug}` })), { label: "Frequently asked questions", href: "/help" }]} />
    </>
  );
}
