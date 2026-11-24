import Link from "next/link";
import { loadFsCtx } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { FsGate, FsTabs } from "@/components/forsale/ui";
import { SellForm } from "@/components/forsale/form";
import { Ic } from "@/components/zip/ic";
import { newDraft } from "@/lib/forsale-shared";

export const metadata = { title: "Sell your business", robots: { index: false, follow: false } };

export default async function NewListing() {
  const [ctx, tabs] = await Promise.all([loadFsCtx(), fsTabs()]);
  if (!ctx.member) return <FsFrame><FsGate t="Sell your business on SME Hub" x="Join free, then upgrade to Plus to list your business for sale." /></FsFrame>;
  if (!ctx.paid)
    return (
      <FsFrame>
        <FsTabs a="mysales" {...tabs} />
        <div className="card crempty">
          <span className="sq big"><Ic n="lock" s={22} /></span>
          <strong>Selling a business is for Plus members and Advisors</strong>
          <p className="muted" style={{ maxWidth: 520 }}>This keeps listings real: every seller is a paying member the Hub team can reach. Browsing and contacting sellers stays free.</p>
          <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}><Link className="btn" href="/membership-plans">See membership plans</Link></div>
        </div>
      </FsFrame>
    );
  return <FsFrame><SellForm initial={newDraft(ctx.location)} tabs={tabs} /></FsFrame>;
}
