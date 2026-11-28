import { notFound, permanentRedirect } from "next/navigation";
import { POL_OLD, POLICIES_V2, polById, polBySlug } from "@/lib/policies";
import { PolicyView } from "@/components/policies/policy-view";

/** Update 45: the 10 SME Hub policies. The old Discrimination policy address shows Accessibility and non-discrimination. */
export const generateStaticParams = () => [...POLICIES_V2.map((p) => ({ slug: p.slug })), ...Object.keys(POL_OLD).map((slug) => ({ slug }))];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = polBySlug((await params).slug);
  return p ? { title: p.title, description: p.short, alternates: { canonical: `/policies/${p.slug}` } } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (POL_OLD[slug]) permanentRedirect(`/policies/${polById(POL_OLD[slug])!.slug}`);
  const p = polBySlug(slug);
  if (!p) notFound();
  return <PolicyView p={p} />;
}
