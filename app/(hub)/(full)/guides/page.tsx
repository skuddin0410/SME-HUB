import { ProvinceIndex } from "@/components/guides/province";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";

export const metadata = pageMeta({ title: "Business guides for every province", description: "Sales tax, payroll rules, how to register, funding and what to watch, for all 13 provinces and territories.", path: "/guides" });

export default function GuidesPage() {
  return <ProvinceIndex />;
}
