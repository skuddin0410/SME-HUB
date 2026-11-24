import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { BusinessForm } from "@/components/business-form";
import { getBusinessSettings } from "@/lib/business-server";
import { pageMeta } from "@/lib/seo";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({ title: "Add a business", description: "Add your business to the SME Hub directory.", path: "/businesses/new", index: false });

export default async function AddBusinessPage() {
  const { supabase, userId, isStaff } = await requireUser();
  const settings = await getBusinessSettings();
  const { count } = await supabase.from("companies").select("id", { count: "exact", head: true }).eq("owner_id", userId).neq("status", "deleted");
  const owned = count ?? 0;
  const canAdd = isStaff || owned < settings.member_limit;
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="pagehead">
          <p className="eyebrow">Business Directory</p>
          <h1>Add a business</h1>
          <p className="muted">Five quick details to start. You can save a draft, preview the page and add the rest later.</p>
        </div>
        {canAdd ? (
          <div className="cols">
            <section className="mid"><BusinessForm categories={settings.categories} /></section>
            <aside className="rail" style={{ flex: "1 1 300px" }}>
              <div className="card">
                <h2>Is it already listed?</h2>
                <p className="muted small">Search the directory for the name and city first. If your business is there, claim it instead of creating a second page.</p>
                <Link href="/businesses" className="btn sm ghost" style={{ alignSelf: "flex-start" }}>Search the directory</Link>
              </div>
            </aside>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 640 }}>
            <strong>You already own {owned} business {owned === 1 ? "page" : "pages"}, which is the limit of {settings.member_limit}.</strong>
            <p className="muted">Delete a page you no longer need, or contact the team.</p>
            <div className="row"><Link href="/businesses/mine" className="btn sm ghost">My Businesses</Link></div>
          </div>
        )}
      </div>
    </div>
  );
}
