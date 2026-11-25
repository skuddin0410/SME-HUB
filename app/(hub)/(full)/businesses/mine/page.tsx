import { Crumbs } from "@/components/zip/crumbs";
import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { ZipSubmit } from "@/components/zip/submit";
import { Ic } from "@/components/zip/ic";
import { deleteBusiness } from "@/app/(hub)/business-actions";
import { ROLES, STATUS_LABEL, type Role } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { pageMeta } from "@/lib/seo";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "My businesses", description: "The business pages you own or help manage.", path: "/businesses/mine", index: false });

type Row = { role: Role; company: { id: string; slug: string; name: string; category: string; city: string; province: string; status: string; owner_id: string; logo_url: string | null } };

export default async function MyBusinessesPage() {
  const { supabase, userId, isStaff } = await requireUser();
  const settings = await getBusinessSettings();
  const { data } = await supabase
    .from("business_team")
    .select("role, company:companies!inner(id, slug, name, category, city, province, status, owner_id, logo_url)")
    .eq("user_id", userId)
    .neq("company.status", "deleted");
  const mine = (data ?? []) as unknown as Row[];
  const owned = mine.filter((r) => r.company.owner_id === userId).length;
  const canAdd = isStaff || owned < settings.member_limit;
  const followers = new Map<string, number>();
  await Promise.all(mine.map(async (r) => followers.set(r.company.id, Number((await supabase.rpc("business_follower_count", { cid: r.company.id })).data ?? 0))));
  const pill = (st: string) => (st === "published" ? "on" : st === "pending" ? "warn" : "");

  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="stack grow" style={{ gap: 4 }}>
            <Crumbs items={[["My Businesses"]]} />
            <h1>My Businesses</h1>
            <p className="muted">Pages you own or help manage.</p>
          </div>
          {canAdd && <Link href="/businesses/new" className="btn"><Ic n="store" s={15} />Add a business</Link>}
        </div>

        {mine.length > 0 ? (
          <div className="stack" style={{ gap: 12 }}>
            {mine.map(({ role, company: c }) => (
              <div key={c.id} className="card bzmine">
                <div className="row" style={{ flexWrap: "wrap" }}>
                  <span className="av l bzav" aria-hidden="true" style={{ borderRadius: 14 }}>
                    {c.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.logo_url} alt="" /> : c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="stack grow" style={{ gap: 3, flexBasis: 220, minWidth: 0 }}>
                    <strong style={{ font: "800 17px var(--display)" }}>{c.name}</strong>
                    <span className="muted small">{[c.category || "No category", c.city && `${c.city}, ${c.province}`].filter(Boolean).join(" · ")}</span>
                    <span className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className={`pill ${pill(c.status)}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                      <span className="pill">Your role: {ROLES[role]}</span>
                      <span className="muted small">{followers.get(c.id) ?? 0} follower{followers.get(c.id) === 1 ? "" : "s"}</span>
                    </span>
                  </div>
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    {(role === "owner" || role === "manager") && <Link href={`/businesses/mine/${c.slug}`} className="btn"><Ic n="edit" s={15} />Edit</Link>}
                    {role === "responder" && <Link href={`/businesses/mine/${c.slug}/inbox`} className="btn">Inbox</Link>}
                    <Link href={`/businesses/${c.slug}`} className="btn ghost">View page</Link>
                    {c.owner_id === userId && (
                      <form action={deleteBusiness.bind(null, c.id)}><ZipSubmit className="btn ghost sm">Delete</ZipSubmit></form>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <strong>You do not manage a business page yet.</strong>
            <p className="muted">Add yours, or find it in the directory and claim it.</p>
          </div>
        )}
        {!canAdd && (
          <div className="card" style={{ marginTop: 16 }}>
            <strong>You have reached the limit of {settings.member_limit} business {settings.member_limit === 1 ? "page" : "pages"}.</strong>
            <p className="muted">Delete a page you no longer need, or contact the team.</p>
          </div>
        )}
      </div>
    </div>
  );
}
