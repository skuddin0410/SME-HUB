import { requireUser } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { loadOwnDetails } from "@/lib/profile-data";
import { getHubSettings } from "@/lib/zip/settings-load";
import { mayCloseAccount } from "@/lib/zip/profile-rules";
import { listSessions } from "@/app/auth/actions";
import { VISIBILITY_FIELDS } from "@/lib/profile-extra";
import { PLAN_INFO, type PlanKey } from "@/lib/billing";
import { DEFAULT_SETTINGS, type MemberSettings } from "@/lib/settings";
import { SettingsX, type SxData, type SxField } from "@/components/zip/settings-x";
import { settingsSections } from "@/lib/settings-nav";
import type { CardStyle } from "@/lib/business-card";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = pageMeta({ title: "Settings and privacy", description: "Your account, privacy, notifications, business card and data on SME Hub.", path: "/settings", index: false });
export const dynamic = "force-dynamic";

// the extra parts members could already restrict, in the design's groups
const EXTRA_GROUP: Record<string, string> = { location: "Business", helps_with: "Work history", needs: "Work history", availability: "Contact", social_links: "Contact", followers: "About" };

/** Update 33: Settings and privacy (replaces "Privacy and account"). */
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const { supabase, userId } = await requireUser();
  const ps = await getHubSettings("profiles");
  const [details, sessions, auth, me, sec, ms, card, off, blocked] = await Promise.all([
    loadOwnDetails(supabase, userId),
    listSessions(),
    supabase.auth.getUser(),
    supabase.from("profiles").select("plan, founding_number, profile_type").eq("id", userId).maybeSingle(),
    supabase.from("user_security").select("email_code").eq("user_id", userId).maybeSingle(),
    supabase.from("member_settings").select("*").eq("member_id", userId).maybeSingle(),
    supabase.from("business_cards").select("style, searchable").eq("member_id", userId).maybeSingle(),
    supabase.from("email_opt_out").select("grp").eq("member_id", userId),
    supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("blocker_id", userId),
  ]);
  const handle = ((await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle()).data as { handle?: string } | null)?.handle;
  const plan = (((me.data as { plan?: string } | null)?.plan as PlanKey) ?? "free") as PlanKey;
  const team = (ps.fields ?? []) as SxField[];
  const vis0 = (details.visibility ?? {}) as Record<string, string>;
  // the team's Details fields (social networks use the older "social links" choice), then the older parts members
  // could restrict. City is always public; it only shows here for a member who had hidden it before.
  const fields: SxField[] = [
    ...team.filter((f) => f.k !== "social"),
    ...VISIBILITY_FIELDS.filter(([k]) => !team.some((f) => f.k === k) && (k !== "location" || (vis0.location && vis0.location !== "public"))).map(([k, l]) => ({
      k,
      l: k === "social_links" ? "Social networks" : l,
      g: EXTRA_GROUP[k] ?? "About",
      vis: "public",
      lock: false,
    })),
  ];
  const pv = (ps as { pv?: { on?: boolean; optout?: boolean } }).pv;
  const data: SxData = {
    email: auth.data.user?.email ?? "",
    planLabel: plan === "free" ? "Free Member" : PLAN_INFO[plan].name,
    founding: (me.data as { founding_number?: number | null } | null)?.founding_number != null,
    sessions,
    twoStep: (sec.data as { email_code?: boolean } | null)?.email_code !== false,
    settings: ms.error ? null : { ...DEFAULT_SETTINGS, ...((ms.data ?? {}) as Partial<MemberSettings>) },
    fields,
    vis: details.visibility ?? {},
    pvSwitch: pv?.on !== false && pv?.optout !== false,
    recordViews: !details.private_browsing,
    blocked: blocked.count ?? 0,
    card: handle && !card.error ? { handle, style: ((card.data as { style?: CardStyle } | null)?.style ?? "classic") as CardStyle, searchable: (card.data as { searchable?: boolean } | null)?.searchable === true } : null,
    forsaleEmails: !((off.data ?? []) as { grp: string }[]).some((r) => r.grp === "forsale"),
    exportData: ps.exportData !== false,
    canClose: mayCloseAccount(ps, plan),
    closeRule: (ps.del as "all" | "free" | "none") ?? "free",
    sections: settingsSections((me.data as { profile_type?: string } | null)?.profile_type === "advisor" || plan === "advisor"),
    profilePath: `/members/${userId}`,
  };
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <SettingsX data={data} initial={sp.s ?? "account"} />
      </div>
    </div>
  );
}
