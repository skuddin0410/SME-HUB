import { SECTIONS } from "@/lib/content";
import { ZipStoryIndex } from "@/components/zip/articles";

export const metadata = { title: SECTIONS.podcast.name };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const sp = await searchParams;
  return <ZipStoryIndex section="podcast" q={(sp.q ?? "").slice(0, 80)} cat={sp.cat ?? ""} />;
}
