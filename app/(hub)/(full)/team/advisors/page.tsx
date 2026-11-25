import { redirect } from "next/navigation";
import { getViewer } from "@/lib/hub";
import { TeamGate, TeamHead, TeamWrap } from "@/components/zip/team";
import { AddAdvisor, AdvisorCard, type TeamAdvisor } from "@/components/advisors/team";

export const metadata = { title: "Advisor profiles", robots: { index: false } };

type AP = TeamAdvisor["ap"];

export default async function TeamAdvisorsPage() {
  const { supabase, userId, isStaff } = await getViewer();
  if (!userId) redirect("/auth/login");
  // an advisor can manage their own profile and call times here; the Hub team manages everyone
  const own = !isStaff ? ((await supabase.from("advisor_profiles").select("user_id").eq("user_id", userId).maybeSingle()).data) : null;
  if (!isStaff && !own) return <TeamGate name="Advisor profiles" />;
  let q = supabase.from("advisor_profiles").select("user_id, field, years, helped, rating, reply, langs, creds, services, session_title, session_at, active, profile:profiles!advisor_profiles_user_id_fkey(full_name, avatar_url, headline)");
  if (!isStaff) q = q.eq("user_id", userId);
  const { data: rows } = await q.limit(300);
  const list = (rows ?? []) as unknown as (AP & { user_id: string; profile: { full_name: string | null; avatar_url: string | null; headline: string | null } | null })[];
  const ids = list.map((r) => r.user_id);
  const now = new Date().toISOString();
  const [slotsRes, seatsRes, revRes, candRes] = await Promise.all([
    ids.length ? supabase.from("advisor_slots").select("id, advisor_id, starts_at, minutes, question, booker:profiles!advisor_slots_booked_by_fkey(id, full_name)").in("advisor_id", ids).gt("starts_at", now).order("starts_at").limit(1000) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("advisor_seats").select("advisor_id").in("advisor_id", ids).limit(5000) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("advisor_reviews").select("advisor_id").in("advisor_id", ids).limit(5000) : Promise.resolve({ data: [] }),
    isStaff ? supabase.from("profiles").select("id, full_name, headline").eq("member_type", "advisor").eq("status", "active").order("full_name").limit(300) : Promise.resolve({ data: [] }),
  ]);
  const count = (rows: { advisor_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.advisor_id === id).length;
  const slots = (slotsRes.data ?? []) as unknown as { id: string; advisor_id: string; starts_at: string; minutes: number; question: string; booker: { id: string; full_name: string | null } | null }[];
  const advisors: TeamAdvisor[] = list.map((r) => ({
    id: r.user_id, name: r.profile?.full_name || "Member", avatar: r.profile?.avatar_url ?? null, headline: r.profile?.headline ?? "",
    ap: { field: r.field, years: r.years, helped: r.helped, rating: r.rating, reply: r.reply, langs: r.langs, creds: r.creds ?? [], services: r.services ?? [], session_title: r.session_title, session_at: r.session_at, active: r.active },
    slots: slots.filter((s) => s.advisor_id === r.user_id).map((s) => ({ id: s.id, at: s.starts_at, minutes: s.minutes, question: s.question, booker: s.booker ? { id: s.booker.id, name: s.booker.full_name || "A member" } : null })),
    seats: count(seatsRes.data as { advisor_id: string }[] | null, r.user_id), reviews: count(revRes.data as { advisor_id: string }[] | null, r.user_id),
  })).sort((a, b) => a.name.localeCompare(b.name));
  const candidates = ((candRes.data ?? []) as { id: string; full_name: string | null; headline: string | null }[]).filter((c) => !ids.includes(c.id)).map((c) => ({ id: c.id, name: c.full_name || "Member", headline: c.headline ?? "" }));
  return (
    <TeamWrap>
      <TeamHead title={isStaff ? "Advisor profiles" : "My advisor profile"} text={isStaff ? "SMB Advisors shown on the Hub: their profile, intro call times and bookings. Advisors can manage their own times here too." : "Your advisor profile and the intro call times members can book. Times are in Toronto time."} />
      <div className="stack" style={{ gap: 16 }}>
        {isStaff && <AddAdvisor candidates={candidates} />}
        {advisors.length ? advisors.map((a) => <AdvisorCard key={a.id} a={a} staff={isStaff} />) : <div className="card"><p className="muted">No advisors yet.</p></div>}
      </div>
    </TeamWrap>
  );
}
