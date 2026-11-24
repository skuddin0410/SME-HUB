"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/zip/ic";
import { FsTabs, useFs } from "@/components/forsale/ui";
import { setChecked, setHidden } from "@/app/(hub)/forsale-actions";
import { FS_ST, listedAgo, priceText, where } from "@/lib/forsale-shared";
import type { TeamRow } from "@/lib/forsale";

const PLAN: Record<string, string> = { free: "Free Member", plus: "Plus", advisor: "Advisor" };

/** Team: manage listings (screen 10). The seller is always shown to the team. */
export function TeamListings({ rows, tabs }: { rows: TeamRow[]; tabs: { mine: number; unread: number; saved: number } }) {
  const x = useFs();
  const router = useRouter();
  const act = async (f: () => Promise<{ error?: string }>, ok: string) => {
    const r = await x.run(f);
    if (!r || r.error) return x.toast(r?.error ?? "Something went wrong. Try again.");
    x.toast(ok);
    router.refresh();
  };
  return (
    <>
      <FsTabs a="saleadmin" {...tabs} />
      <div className="pagehead">
        <p className="eyebrow">Hub team</p>
        <h1>Businesses for sale</h1>
        <p className="muted">New listings go live straight away. Check each one within 2 working days: the seller is a real paid member, the numbers look sensible and nothing breaks the community guidelines. Then mark it as checked.</p>
      </div>
      <div className="card fsadm">
        <table className="fstable">
          <thead>
            <tr><th scope="col">Listing</th><th scope="col">Seller</th><th scope="col">Status</th><th scope="col">Checked</th><th scope="col">Reports</th><th scope="col"><span className="sr">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td>
                  <Link href={`/for-sale/${l.slug}`}>{l.title}</Link><br />
                  <span className="small muted">{priceText({ por: l.price_on_request, price: l.price })} · {where({ area: l.area_shown, province: l.province })} · {listedAgo(l.created_at)}</span>
                </td>
                <td>{l.seller.name}<br /><span className="small muted">{PLAN[l.seller.plan] ?? ""}{l.confidential ? " · hidden from buyers" : ""}</span></td>
                <td><span className={`fsst ${FS_ST[l.status][1]}`}>{FS_ST[l.status][0]}</span></td>
                <td>{l.checked_at ? <span className="fsver"><Ic n="shield" s={14} />Yes</span> : <span className="small fswarnt">Not yet</span>}</td>
                <td>{l.reports ? <b className="fswarnt">{l.reports}</b> : <span className="muted">0</span>}</td>
                <td className="fsadmact">
                  {l.checked_at ? (
                    <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => act(() => setChecked(l.id, false), "Check removed")}>Uncheck</button>
                  ) : (
                    <button type="button" className="btn sm" disabled={x.busy} onClick={() => act(() => setChecked(l.id, true), "Marked as checked. Buyers see the shield.")}>Mark as checked</button>
                  )}
                  {l.status === "hidden" ? (
                    <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => act(() => setHidden(l.id, false), "Restored")}>Restore</button>
                  ) : (
                    <button type="button" className="btn sm ghost" disabled={x.busy} onClick={() => act(() => setHidden(l.id, true), "Hidden from buyers. Email the seller to explain why.")}>Hide</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
