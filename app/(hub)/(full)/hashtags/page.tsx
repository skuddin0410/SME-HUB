import { HashtagsDirectory } from "@/components/zip/hashtags";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Hashtags", description: "Find conversations by subject in the Hub.", path: "/hashtags" });

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <HashtagsDirectory q={((await searchParams).q ?? "").slice(0, 60)} />;
}
