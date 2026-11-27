import Link from "next/link";
import { getViewer } from "@/lib/hub";
import { Ic } from "@/components/zip/ic";
import { getBusinessSettings } from "@/lib/business-server";
import { bizChecks } from "@/lib/business-complete";
import { pageMeta } from "@/lib/seo";
import { MyBusinesses, type MxBiz, type MxClaim } from "@/components/zip/my-businesses";
import type { Role } from "@/lib/business";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";
import "@/styles/u31-40.css";

export const metadata = pageMeta({ title: "My businesses", description: "The business pages you own or help manage.", path: "/businesses/mine", index: false });
export const dynamic = "force-dynamic";

type Co = {
  id: string; slug: string; name: string; category: string; sub: string | null; city: string; province: string; status: string; owner_id: string;
  logo_url: string | null; cover_url: string | null; about: string | null; hours: Record<string, unknown[]> | null; appointments: boolean | null;
  social: Record<string, string> | null; website: string | null; reject_reason?: string | null;
};
const COLS = "id, slug, name, category, sub, city, province, status, owner_id, logo_url, cover_url, about, hours, appointments, social, website";

/** Update 40: My businesses. Every page you own or help run, with its numbers, quick actions and how complete it is. */
export default async function MyBusinessesPage() {
  const { supabase, userId, isStaff } = await getViewer();
  if (!userId) {
    return (
      <div className="zip"><div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="mxpage"><div className="mxjoin">
          <p className="mxeye"><Ic n="store" s={13} /> My businesses</p>
          <h1>Put your business on SME Hub</h1>
          <p>A free page in the Business Directory, with inquiries, reviews and updates to your followers.</p>
          <Link className="btn dark" href="/auth/sign-up?next=/businesses/mine">Join free</Link>
        </div></div>
      </div></div>
    );
  }
  const settings = await getBusinessSettings();
  // the reason a page was turned down comes with migration 0076; read it on its own so the page works before that
  let res: { data: unknown; error: unknown } = await supabase.from("business_team").select(`role, company:companies!inner(${COLS}, reject_reason)`).eq("user_id", userId).neq("company.status", "deleted");
  if (res.error) res = await supabase.from("business_team").select(`role, company:companies!inner(${COLS})`).eq("user_id", userId).neq("company.status", "deleted");
  const rows = (res.data ?? []) as unknown as { role: Role; company: Co }[];

  const biz: MxBiz[] = await Promise.all(rows.map(async ({ role, company: c }) => {
    const edit = isStaff || role === "owner" || role === "manager";
    const inbox = isStaff || role === "owner" || role === "manager" || role === "responder";
    const [team, priv, services, photos, posts, followers, reviews, inq, open, views] = await Promise.all([
      supabase.from("business_team").select("user_id", { count: "exact", head: true }).eq("company_id", c.id),
      edit ? supabase.from("business_private").select("email, phone").eq("company_id", c.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("business_services").select("id", { count: "exact", head: true }).eq("company_id", c.id),
      supabase.from("business_photos").select("id", { count: "exact", head: true }).eq("company_id", c.id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("business_id", c.id),
      supabase.rpc("business_follower_count", { cid: c.id }),
      supabase.from("company_reviews").select("rating, status").eq("company_id", c.id).limit(1000),
      inbox ? supabase.from("business_inquiries").select("id", { count: "exact", head: true }).eq("company_id", c.id) : Promise.resolve({ count: null }),
      inbox ? supabase.from("business_inquiries").select("id", { count: "exact", head: true }).eq("company_id", c.id).eq("status", "open") : Promise.resolve({ count: null }),
      supabase.rpc("business_views_30", { p_company: c.id }),
    ]);
    const p = (priv.data ?? {}) as { email?: string; phone?: string };
    const rv = ((reviews.data ?? []) as { rating: number; status?: string }[]).filter((r) => !r.status || r.status === "published");
    const avg = rv.length ? Math.round((rv.reduce((a, r) => a + r.rating, 0) / rv.length) * 10) / 10 : null;
    const checks = bizChecks({
      logo_url: c.logo_url, cover_url: c.cover_url, about: c.about, hours: c.hours, appointments: c.appointments,
      services: services.count ?? 0, photos: photos.count ?? 0, website: c.website, phone: p.phone ?? null, email: p.email ?? null, social: c.social, updates: posts.count ?? 0,
    });
    return {
      id: c.id, slug: c.slug, name: c.name, cat: [c.category, c.sub].filter(Boolean).join(", ") || "No category", place: [c.city, c.province].filter(Boolean).join(", "),
      status: c.status, reason: c.reject_reason ?? null, logo: c.logo_url, cover: c.cover_url, role, team: team.count ?? 1,
      can: { edit, post: edit || role === "editor", inbox },
      followers: Number(followers.data ?? 0), views: typeof views.data === "number" ? views.data : null,
      inquiries: inq.count ?? null, unread: open.count ?? 0, reviews: { avg, n: rv.length }, updates: posts.count ?? 0,
      // with the Photos tab switched off by the team, "3 or more photos" can't be done, so it isn't counted
      checks: edit ? checks.filter((x) => x.key !== "photos" || settings.tabs.photos) : null, photosTab: settings.tabs.photos,
    };
  }));

  let cr: { data: unknown; error: unknown } = await supabase.from("business_claims").select("id, status, created_at, decided_at, reason, company:companies(id, slug, name, logo_url)").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  if (cr.error) cr = await supabase.from("business_claims").select("id, status, created_at, decided_at, company:companies(id, slug, name, logo_url)").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  const claims = ((cr.data ?? []) as unknown as { id: string; status: MxClaim["status"]; created_at: string; decided_at: string | null; reason?: string | null; company: { id: string; slug: string; name: string; logo_url: string | null } | null }[])
    .map((c) => ({ id: c.id, status: c.status, at: c.created_at, decided: c.decided_at, reason: c.reason ?? null, biz: c.company }));
  // "Latest": decisions in the last 30 days
  const latest = claims.filter((c) => c.decided && Date.now() - Date.parse(c.decided) < 30 * 86400_000)
    .map((c) => (c.status === "approved" ? `Your claim for ${c.biz?.name ?? "a business"} was approved. You are now the owner.` : `Your claim for ${c.biz?.name ?? "a business"} wasn’t approved.`));
  for (const b of biz) if (b.status === "rejected") latest.push(`${b.name} wasn’t approved yet. Fix the details and send it again.`);
  const owned = rows.filter((r) => r.company.owner_id === userId).length;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <MyBusinesses biz={biz} claims={claims} latest={latest.slice(0, 4)} owned={owned} limit={settings.member_limit} canAdd={isStaff || owned < settings.member_limit} />
      </div>
    </div>
  );
}
