import { loadFsCtx, loadTeam } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { TeamListings } from "@/components/forsale/team";
import { TeamGate } from "@/components/courses/team-gate";

export const metadata = { title: "For-sale listings", robots: { index: false, follow: false } };

export default async function TeamForSale() {
  const [ctx, tabs] = await Promise.all([loadFsCtx(), fsTabs()]);
  if (!ctx.staff) return <FsFrame><TeamGate name="Managing businesses for sale" /></FsFrame>;
  return <FsFrame><TeamListings rows={await loadTeam()} tabs={tabs} /></FsFrame>;
}
