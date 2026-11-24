import { pageMeta } from "@/lib/seo";
import { loadBrowse } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { Browse } from "@/components/forsale/browse";

export const metadata = pageMeta({
  title: "Businesses for sale in Canada",
  description: "Buy a Canadian small business that’s already running. Every listing comes from a paid SME Hub member, and buyers contact sellers directly, with no broker in the middle.",
  path: "/for-sale",
  image: "/zip/img/bizcover-maple.jpg",
});

export default async function ForSalePage() {
  const [all, tabs] = await Promise.all([loadBrowse(), fsTabs()]);
  return <FsFrame><Browse all={all} tabs={tabs} /></FsFrame>;
}
