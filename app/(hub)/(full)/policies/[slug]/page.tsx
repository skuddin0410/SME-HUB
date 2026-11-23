import { notFound } from "next/navigation";
import { POLICIES } from "@/lib/content";
import { ZipPolicy } from "@/components/zip/info";

export const generateStaticParams = () => POLICIES.map((p) => ({ slug: p.slug }));
const find = (slug: string) => POLICIES.find((p) => p.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: find((await params).slug)?.title };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!find(slug)) notFound();
  return <ZipPolicy slug={slug} />;
}
