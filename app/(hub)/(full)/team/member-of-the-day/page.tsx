import { TeamHead, TeamWrap, teamViewer } from "@/components/zip/team";
import { MotdTeam } from "@/components/zip/motd-team";

export const metadata = { title: "Member of the Day", robots: { index: false } };

/** Update 11: the Hub team picks each day's Member of the Day; days with no pick are chosen automatically. */
export default async function Page() {
  const { supabase, gate } = await teamViewer("Member of the Day");
  if (gate) return gate;
  const { data: todayRaw } = await supabase.rpc("motd_today");
  const today = typeof todayRaw === "string" ? todayRaw : new Date().toISOString().slice(0, 10);
  const from = new Date(Date.parse(`${today}T12:00:00Z`) - 90 * 864e5).toISOString().slice(0, 10);
  const [{ data: rows }, { data: cands }] = await Promise.all([
    supabase.from("member_of_day").select("day, member_id, picked_by, member:profiles!member_of_day_member_id_fkey(full_name)").gte("day", from).order("day", { ascending: true }),
    supabase.from("profiles").select("id, full_name, headline").eq("ready_count", 5).eq("status", "active").order("full_name").limit(500),
  ]);
  const R = ((rows ?? []) as unknown as { day: string; member_id: string; picked_by: string | null; member: { full_name: string } | null }[]);
  const last = new Map<string, string>();
  for (const r of R) if (r.day < today) last.set(r.member_id, r.day);
  return (
    <TeamWrap>
      <TeamHead title="Member of the Day" text="Pick who is featured on Home each day. Members see the card in the left panel. Days you leave empty are chosen automatically." />
      <MotdTeam
        today={today}
        rows={R.map((r) => ({ day: r.day, member_id: r.member_id, name: r.member?.full_name ?? "A member", auto: !r.picked_by }))}
        candidates={((cands ?? []) as { id: string; full_name: string; headline: string | null }[]).map((c) => ({ id: c.id, name: c.full_name, headline: c.headline ?? "", last: last.get(c.id) ?? null }))}
      />
    </TeamWrap>
  );
}
