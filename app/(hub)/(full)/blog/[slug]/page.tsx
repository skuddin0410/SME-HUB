import { SECTIONS } from "@/lib/content";
import { ZipStoryPage } from "@/components/zip/articles";

export const generateStaticParams = () => SECTIONS.blog.items.map((i) => ({ slug: i.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: SECTIONS.blog.items.find((i) => i.slug === slug)?.title };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ZipStoryPage section="blog" slug={(await params).slug} />;
}
