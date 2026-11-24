import Link from "next/link";
import { loadFsCtx, loadListingRow } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { FsGate, FsTabs } from "@/components/forsale/ui";
import { SellForm } from "@/components/forsale/form";
import { toDraft } from "@/lib/forsale-shared";

export const metadata = { title: "Sell your business", robots: { index: false, follow: false } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditListing({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [ctx, tabs] = await Promise.all([loadFsCtx(), fsTabs()]);
  if (!ctx.member) return <FsFrame><FsGate t="Sell your business on SME Hub" x="Join free, then upgrade to Plus to list your business for sale." /></FsFrame>;
  // sellers and the team can read the row; anyone else gets nothing back
  const row = UUID.test(slug) ? await loadListingRow(slug) : null;
  if (!row)
    return (
      <FsFrame>
        <FsTabs a="mysales" {...tabs} />
        <div className="card crempty"><strong>You can’t edit this listing.</strong><Link className="btn" href="/for-sale/my-listings">My listings</Link></div>
      </FsFrame>
    );
  return <FsFrame><SellForm initial={toDraft(row)} tabs={tabs} /></FsFrame>;
}
