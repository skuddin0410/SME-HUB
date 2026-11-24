import Link from "next/link";
import { pageMeta, snippet } from "@/lib/seo";
import { loadDetail, loadSimilar } from "@/lib/forsale";
import { FsFrame, fsTabs } from "@/components/forsale/frame";
import { FsTabs } from "@/components/forsale/ui";
import { Listing } from "@/components/forsale/listing";
import { Ic } from "@/components/zip/ic";
import { priceText } from "@/lib/forsale-shared";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await loadDetail(slug);
  if (!l) return { title: "Businesses for sale", robots: { index: false } };
  // the area shown is all a confidential seller lets anyone see; nothing more goes into the page title or description
  return pageMeta({
    title: `${l.title} | Businesses for sale`,
    description: `${l.industry} in ${l.area}, ${l.province}. Asking ${priceText(l)}. ${snippet(l.description[0] ?? "", 110)}`,
    path: `/for-sale/${l.slug}`,
    image: l.photo,
    index: l.status === "live" || l.status === "offer",
  });
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await loadDetail(slug);
  if (!l)
    return (
      <FsFrame>
        <FsTabs a="" {...await fsTabs()} />
        <div className="card crempty">
          <span className="sq big"><Ic n="tag" s={22} /></span>
          <strong>This listing isn’t available</strong>
          <p className="muted">It may have been sold or taken down by the seller.</p>
          <Link className="btn" href="/for-sale">See businesses for sale</Link>
        </div>
      </FsFrame>
    );
  const similar = await loadSimilar(l.id);
  return <FsFrame><Listing l={l} similar={similar} /></FsFrame>;
}
