import { notFound } from "next/navigation";
import { CentrePage } from "@/components/resources/centre";
import { CMD, cmBySlug } from "@/lib/resources/data";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/resources.css";

export const generateStaticParams = () => CMD.map((c) => ({ slug: c.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = cmBySlug((await params).slug);
  return p ? pageMeta({ title: `${p.n}: resources, funding and support`, description: p.sub, path: `/resources/${p.slug}`, image: `/zip/img/${p.img}.jpg` }) : { title: "Page not found" };
}

/** Update 15: community resource centres. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = cmBySlug((await params).slug);
  if (!p) notFound();
  return <CentrePage p={p} />;
}
