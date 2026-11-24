import { pageMeta } from "@/lib/seo";
import { ZipAbout } from "@/components/zip/info";

export const metadata = pageMeta({ title: "About SME Hub", description: "SME Hub is CanadianSME's network for Canadian small business owners, advisors and professionals.", path: "/about" });

export default function AboutPage() {
  return <ZipAbout />;
}
