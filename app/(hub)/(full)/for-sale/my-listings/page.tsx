import { loadFsCtx, loadMine } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { FsGate, FsTabs } from "@/components/forsale/ui";
import { MyListings } from "@/components/forsale/my";

export const metadata = { title: "Sell your business", robots: { index: false, follow: false } };

export default async function MyListingsPage() {
  const [ctx, tabs] = await Promise.all([loadFsCtx(), fsTabs()]);
  if (!ctx.member)
    return <FsFrame><FsTabs a="mysales" {...tabs} /><FsGate t="Sell your business on SME Hub" x="Join free, then upgrade to Plus to list your business for sale." /></FsFrame>;
  const { listings, enquiries } = await loadMine();
  return <FsFrame><MyListings listings={listings} enquiries={enquiries} tabs={tabs} /></FsFrame>;
}
