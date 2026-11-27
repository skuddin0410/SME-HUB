import { pageMeta } from "@/lib/seo";
import { requireUser } from "@/lib/hub";
import { SettingsX } from "@/components/zip/settings-x";
import { ConsultSection } from "@/components/zip/zoom-x";
import { loadSettingsData } from "@/lib/zip/settings-data";
import { myApps } from "@/lib/apps/settings-load";
import { siteUrl } from "@/lib/courses-mail";
import { callWhen } from "@/lib/consult";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = pageMeta({ title: "Free consultations", description: "Set when members can book a free call with you.", path: "/settings/consultations", index: false });
export const dynamic = "force-dynamic";

/** Update 36: Settings and privacy → Free consultations (SME Advisors). */
export default async function ConsultationsPage() {
  const { supabase, userId } = await requireUser();
  const [data, apps, me, up] = await Promise.all([
    loadSettingsData(),
    myApps(supabase, userId),
    supabase.from("profiles").select("handle").eq("id", userId).maybeSingle(),
    supabase.from("consult_bookings").select("id, member_id, starts_at, topic, member:profiles!consult_bookings_member_id_fkey(full_name, avatar_url)")
      .eq("advisor_id", userId).eq("status", "booked").gt("starts_at", new Date(Date.now() - 3600_000).toISOString()).order("starts_at").limit(20),
  ]);
  const handle = (me.data as { handle?: string } | null)?.handle;
  const upcoming = ((up.data ?? []) as unknown as { id: string; member_id: string; starts_at: string; topic: string; member: { full_name: string | null; avatar_url: string | null } | null }[])
    .map((b) => ({ id: b.id, memberId: b.member_id, name: b.member?.full_name || "SME Hub member", avatar: b.member?.avatar_url ?? null, when: callWhen(b.starts_at), topic: b.topic }));
  const s = apps.settings;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <SettingsX data={data} initial="consult" extra={{ id: "consult", node: (
          <ConsultSection d={{
            advisor: apps.advisor,
            zoom: apps.zoom,
            s: up.error && !apps.ready ? null : { len: s.len, gap: s.gap, max_day: s.max_day, ahead: s.ahead, notice: s.notice, hours: s.hours, q_biz: s.q_biz, q_topic: s.q_topic, q_web: s.q_web, reg_mail: s.reg_mail },
            bookingUrl: `${siteUrl()}/advisors/${handle ?? userId}`,
            upcoming,
          }} />
        ) }} />
      </div>
    </div>
  );
}
