import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { mapleLeft } from "@/lib/maple-server";
import { MapleProfile } from "@/components/maple/pages";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Maple, SME Hub’s AI assistant", description: "Maple answers business questions in plain language, with sources, and points you to members and SME Advisors who can help.", path: "/maple" });

/** Update 46: Maple's profile page. */
export default async function MaplePage() {
  const { supabase, userId } = await getViewer();
  let left = null;
  let history = 0;
  if (userId) {
    const [l, c] = await Promise.all([
      mapleLeft(supabase),
      supabase.from("maple_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    left = l;
    if (!c.error) history = c.count ?? 0;
    else {
      const o = await supabase.from("ai_asks").select("id", { count: "exact", head: true }).eq("user_id", userId);
      history = (o.count ?? 0) * 2;
    }
  }
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <MapleProfile left={left} history={history} />
      </div>
    </div>
  );
}
