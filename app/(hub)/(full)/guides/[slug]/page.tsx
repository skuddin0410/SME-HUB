import { notFound } from "next/navigation";
import { findFull, GUIDE_FULL } from "@/lib/smehub";
import { pageMeta } from "@/lib/seo";
import { ZipGuidePage } from "@/components/zip/smehub";

const ALL = GUIDE_FULL;
export const generateStaticParams = () => ALL.map((p) => ({ slug: p.path.split("/").pop()! }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = findFull(`/guides/${(await params).slug}`);
  if (!page) return { title: "Page not found" };
  return pageMeta({ title: page.heads[0].replace(/:$/, ""), description: page.intro, path: page.path, image: page.img });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const page = findFull(`/guides/${(await params).slug}`);
  if (!page) notFound();
  return <ZipGuidePage page={page} />;
}
