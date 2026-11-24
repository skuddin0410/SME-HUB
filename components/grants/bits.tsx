import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { GFT, type Grant } from "@/lib/grants";

/** Update 15: the pieces every Grant Finder page shares (gfTag, gfBadge, gfNote, gfTrust, gfNav in the zip). */
export const GfTag = ({ p }: { p: Pick<Grant, "type"> }) => <span className={`tag ${GFT[p.type][1]}`}>{GFT[p.type][0]}</span>;

export const GfBadge = ({ p }: { p: Pick<Grant, "checked"> }) =>
  p.checked ? (
    <span className="gfbadge ok"><Ic n="check" s={13} />Checked by CanadianSME · {p.checked}</span>
  ) : (
    <span className="gfbadge src"><Ic n="info" s={13} />From the official source · not yet checked by our team</span>
  );

export const GfNote = () => (
  <p className="gfnote"><Ic n="info" s={14} /><span>The programs are real names, but some amounts, dates and rules are still sample details. Our team checks every program; always confirm on the official page before you apply.</span></p>
);

export const GfTrust = () => (
  <div className="gftrust"><Ic n="shield" s={18} /><p><b>We never charge you to get a grant.</b> Always apply on the official government page. Nobody can promise you’ll be approved. <Link href="/grants/safe">How to spot a grant scam</Link></p></div>
);

export function GfNav({ on }: { on: "grants" | "mine" | "safe" }) {
  const items: [typeof on, string, string][] = [["grants", "/grants", "Find funding"], ["mine", "/grants/mine", "My funding"], ["safe", "/grants/safe", "Avoid scams"]];
  return (
    <nav className="tlnav" aria-label="Grant Finder">
      {items.map(([k, h, l]) => <Link key={k} href={h} aria-current={on === k ? "page" : undefined}>{l}</Link>)}
    </nav>
  );
}

export const GfWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}>{children}</div></div>
);
