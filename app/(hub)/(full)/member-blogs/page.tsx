import { MemberBlogsIndex } from "@/components/zip/member-blogs";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Member blogs", description: "Lessons, how-tos and stories written by Canadian small business owners.", path: "/member-blogs" });

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
  const sp = await searchParams;
  return <MemberBlogsIndex q={(sp.q ?? "").slice(0, 80)} cat={sp.cat ?? ""} />;
}
