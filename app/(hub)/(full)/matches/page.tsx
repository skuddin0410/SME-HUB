import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { Matches } from "@/components/matches/matches";
import { DEFAULT_PREFS, roundInfo, type Match, type Prefs } from "@/lib/matches";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "AI matchmaking", description: "Answer five quick questions and meet the right Canadian business owner: someone who can help, at a time you are both free.", path: "/matches" });

const prov = (loc: string | null | undefined) => /,\s*([A-Z]{2})\s*$/.exec(loc ?? "")?.[1] ?? "";

export default async function MatchesPage() {
  const { supabase, userId, profile, isStaff } = await getViewer();
  const round = roundInfo();
  if (!userId || !profile) {
    return <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}><Matches me={null} prefs={DEFAULT_PREFS} hasPrefs={false} list={[]} booked={{}} round={round} visitor /></div></div>;
  }
  const p = profile as { full_name?: string | null; avatar_url?: string | null; location?: string | null; plan?: string | null };
  const [prefsRes, detailsRes, bizRes, limitRes, actsRes] = await Promise.all([
    supabase.from("match_prefs").select("goal, needs, where_pref, avail, format").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_details").select("helps_with, needs").eq("user_id", userId).maybeSingle(),
    supabase.from("companies").select("name").eq("owner_id", userId).eq("status", "published").order("created_at").limit(1),
    supabase.from("plan_limits").select("value").eq("plan", p.plan ?? "free").eq("key", "daily_matches").maybeSingle(),
    supabase.from("match_actions").select("other_id, action, slot, feedback").eq("user_id", userId).eq("action", "book").limit(200),
  ]);
  const pr = prefsRes.data as { goal: string; needs: string[]; where_pref: "near" | "any"; avail: string[]; format: "one" | "group" } | null;
  const details = detailsRes.data as { helps_with: string[]; needs: string[] } | null;
  const prefs: Prefs = pr ? { goal: pr.goal, needs: pr.needs, where: pr.where_pref, avail: pr.avail, format: pr.format } : { ...DEFAULT_PREFS, needs: details?.needs?.slice(0, 6) ?? [] };
  const limit = isStaff ? 5 : Math.max(1, Number((limitRes.data as { value?: number } | null)?.value ?? 3));
  let list: Match[] = [];
  if (pr) {
    const { data } = await supabase.rpc("match_candidates").order("score", { ascending: false }).limit(limit);
    list = ((data ?? []) as { member_id: string; full_name: string; avatar_url: string | null; headline: string | null; location: string | null; plan: string | null; score: number; why: string[]; both_free: string[] }[]).map((r) => ({
      id: r.member_id, name: r.full_name, avatar: r.avatar_url, role: r.headline ?? "", city: r.location ?? "", plan: r.plan ?? "free", score: r.score, why: r.why, both: r.both_free,
    }));
  }
  const booked: Record<string, { slot: string; feedback: string | null }> = {};
  for (const a of (actsRes.data ?? []) as { other_id: string; slot: string; feedback: string | null }[]) booked[a.other_id] = { slot: a.slot, feedback: a.feedback };
  // a booked match stays on the page even after they leave the ranked list
  const me = { name: p.full_name || "You", avatar: p.avatar_url ?? null, biz: ((bizRes.data ?? []) as { name: string }[])[0]?.name ?? "", province: prov(p.location), helps: details?.helps_with ?? [] };
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Matches me={me} prefs={prefs} hasPrefs={!!pr} list={list} booked={booked} round={round} visitor={false} />
      </div>
    </div>
  );
}
