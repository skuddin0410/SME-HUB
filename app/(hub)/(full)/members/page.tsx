import { Directory } from "@/components/zip/directory";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Members", description: "Meet Canadian small business owners, advisors and professionals on SMB Hub.", path: "/members" });

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Directory searchParams={await searchParams} base="/members" />;
}
