import { Directory } from "@/components/zip/directory";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Member directory", description: "Find Canadian small business owners, advisors and makers on SMB Hub by name, skill or place.", path: "/network" });

export default async function NetworkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Directory searchParams={await searchParams} base="/network" />;
}
