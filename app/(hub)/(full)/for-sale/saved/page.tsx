import Link from "next/link";
import { loadFsCtx, loadSaved } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { FsCard, FsGate, FsTabs } from "@/components/forsale/ui";
import { Ic } from "@/components/zip/ic";

export const metadata = { title: "Saved businesses for sale", robots: { index: false, follow: false } };

export default async function SavedSales() {
  const [ctx, tabs] = await Promise.all([loadFsCtx(), fsTabs()]);
  if (!ctx.member)
    return <FsFrame><FsTabs a="savedsales" {...tabs} /><FsGate t="Save businesses you like" x="Join free to save listings and get an email when the price changes." /></FsFrame>;
  const list = await loadSaved();
  return (
    <FsFrame>
      <FsTabs a="savedsales" {...tabs} />
      {list.length ? (
        <div className="fsgrid">{list.map((l) => <FsCard key={l.id} l={l} />)}</div>
      ) : (
        <div className="card crempty">
          <span className="sq big"><Ic n="mark" s={22} /></span>
          <strong>No saved listings yet</strong>
          <p className="muted">Tap the bookmark on any listing to keep it here. We’ll email you if the price changes or it goes under offer.</p>
          <Link className="btn" href="/for-sale">Browse businesses</Link>
        </div>
      )}
    </FsFrame>
  );
}
