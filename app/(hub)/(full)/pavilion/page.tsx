import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import { Pavilion } from "@/components/pavilion/pavilion";
import type { PavListing } from "@/lib/pavilion";
import "@/styles/zip.css";
import "@/styles/zip-extra.css";

export const metadata = pageMeta({
  title: "Made in Canada Pavilion",
  description: "Canadian manufacturers, owner-run services and AI tools built in Canada, all run by SME Hub members. Find one, then ask for an introduction.",
  path: "/pavilion",
});

type Row = {
  id: string; owner_id: string; name: string; by_name: string; section: PavListing["sec"]; what: string; city: string; province: string; scene: string;
  claims: string[]; note: string; ai: boolean; featured: boolean; status: PavListing["status"];
  owner: { full_name: string | null; avatar_url: string | null; headline: string | null } | null;
};

export default async function PavilionPage() {
  const { supabase, userId, profile, isStaff } = await getViewer();
  const [rowsRes, repRes, bizRes] = await Promise.all([
    supabase.from("pavilion_listings").select("id, owner_id, name, by_name, section, what, city, province, scene, claims, note, ai, featured, status, owner:profiles!pavilion_listings_owner_id_fkey(full_name, avatar_url, headline)")
      .order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(500),
    isStaff ? supabase.from("pavilion_reports").select("listing_id").eq("status", "open").limit(1000) : Promise.resolve({ data: [] }),
    userId ? supabase.from("companies").select("name").eq("owner_id", userId).eq("status", "published").order("created_at").limit(1) : Promise.resolve({ data: [] }),
  ]);
  const reps = new Map<string, number>();
  for (const r of (repRes.data ?? []) as { listing_id: string }[]) reps.set(r.listing_id, (reps.get(r.listing_id) ?? 0) + 1);
  const listings: PavListing[] = ((rowsRes.data ?? []) as unknown as Row[])
    // members see published listings and their own; the team also sees what waits for review
    .filter((r) => r.status === "published" || r.owner_id === userId || (isStaff && r.status === "pending"))
    .map((r) => ({
      id: r.id, name: r.name, by: r.by_name, sec: r.section, what: r.what, city: r.city, province: r.province, scene: r.scene, claims: r.claims, note: r.note,
      ai: r.ai, featured: r.featured, status: r.status, mine: r.owner_id === userId, reports: reps.get(r.id) ?? 0,
      owner: { id: r.owner_id, name: r.owner?.full_name || "A member", avatar: r.owner?.avatar_url ?? null, role: r.owner?.headline ?? "" },
    }));
  const meBiz = ((bizRes.data ?? []) as { name: string }[])[0]?.name ?? "";
  return (
    <div className="zip">
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <Pavilion listings={listings} member={!!userId && !!profile} staff={isStaff} meBiz={meBiz} />
      </div>
    </div>
  );
}
