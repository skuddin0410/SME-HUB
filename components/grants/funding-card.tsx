import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { getGrantMe, getGrants } from "@/lib/grants-server";
import { getViewer } from "@/lib/hub";
import { matchesFor } from "@/lib/grants";

/** Home right column (Update 15): "Funding for you", members only. */
export async function FundingCard() {
  const me = await getGrantMe();
  if (!me) return null;
  const { supabase } = await getViewer();
  const M = matchesFor(await getGrants(), me.prov);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count } = await supabase.from("grant_programs").select("id", { count: "exact", head: true }).gte("updated_at", since).in("id", M.map((p) => p.id));
  const fresh = count ?? 0;
  return (
    <div className="card gfrc">
      <h3><Ic n="spark" s={16} />Funding for you</h3>
      <p className="small muted">{M.length} programs match your business{fresh ? `, including ${fresh} new this week` : ""}.</p>
      <Link className="btn ghost" href="/grants">Open Grant Finder</Link>
    </div>
  );
}
