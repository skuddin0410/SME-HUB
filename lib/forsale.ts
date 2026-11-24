import "server-only";
import { cache } from "react";
import { getViewer } from "@/lib/hub";
import type { SaleCard, SaleDetail, SalePerson, SaleStatus, SaleType, Premises } from "@/lib/forsale-shared";

export type FsCtx = { member: boolean; staff: boolean; paid: boolean; userId: string | null; mine: number; unread: number; saved: number; location: string };

/** Who is looking, and the numbers on the tabs. */
export const loadFsCtx = cache(async (): Promise<FsCtx> => {
  const { supabase, userId, profile, isStaff } = await getViewer();
  if (!userId) return { member: false, staff: false, paid: false, userId: null, mine: 0, unread: 0, saved: 0, location: "" };
  const plan = (profile as { plan?: string } | null)?.plan ?? "free";
  const [mine, unread, saved] = await Promise.all([
    supabase.from("sale_listings").select("id", { count: "exact", head: true }).eq("seller_id", userId),
    supabase.rpc("sale_unread_enquiries"),
    supabase.rpc("sale_saved"),
  ]);
  return {
    member: true, staff: isStaff, paid: plan === "plus" || plan === "advisor", userId,
    mine: mine.count ?? 0, unread: (unread.data as number | null) ?? 0, saved: ((saved.data as SaleCard[] | null) ?? []).length,
    location: profile?.location ?? "",
  };
});

export async function loadBrowse(): Promise<SaleCard[]> {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("sale_browse");
  return (data as SaleCard[] | null) ?? [];
}

export async function loadSaved(): Promise<SaleCard[]> {
  const { supabase, userId } = await getViewer();
  if (!userId) return [];
  const { data } = await supabase.rpc("sale_saved");
  return (data as SaleCard[] | null) ?? [];
}

export const loadDetail = cache(async (key: string): Promise<SaleDetail | null> => {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("sale_detail", { p_key: key });
  return (data as SaleDetail | null) ?? null;
});

export async function loadSimilar(id: string): Promise<SaleCard[]> {
  const { supabase } = await getViewer();
  const { data } = await supabase.rpc("sale_similar", { p_id: id });
  return (data as SaleCard[] | null) ?? [];
}

/** A listing row as the seller and the team read it. */
export type ListingRow = {
  id: string; slug: string; seller_id: string; title: string; industry: string; city: string; province: string; area_shown: string;
  price: number; price_on_request: boolean; yearly_sales: number; owner_earnings: number; year_established: number | null; employees: number;
  sale_type: SaleType; premises: Premises; lease_details: string; seller_financing: boolean; training: string; reason: string;
  included: string[]; highlights: string[]; description: string[]; ideal_buyer: string; documents: string[]; photo_url: string;
  confidential: boolean; business_name: string; status: SaleStatus; checked_at: string | null; views: number; saves: number; created_at: string;
};
export type Enquiry = {
  id: string; listing_id: string; funding: string; timing: string; message: string; docs_shared_at: string | null; read_at: string | null;
  thread_at: string | null; created_at: string; buyer: SalePerson;
};

type P = { id: string; full_name: string; headline: string; avatar_url: string | null; member_type?: string; plan?: string };
const person = (p: P): SalePerson => ({ id: p.id, name: p.full_name, role: p.headline, avatar: p.avatar_url, member_type: p.member_type });

/** The seller's own listings (newest first) with their enquiries. */
export async function loadMine(): Promise<{ listings: ListingRow[]; enquiries: Record<string, Enquiry[]> }> {
  const { supabase, userId } = await getViewer();
  if (!userId) return { listings: [], enquiries: {} };
  const { data } = await supabase.from("sale_listings").select("*").eq("seller_id", userId).order("created_at", { ascending: false });
  const listings = (data ?? []) as ListingRow[];
  const enquiries: Record<string, Enquiry[]> = {};
  if (listings.length) {
    const { data: en } = await supabase
      .from("sale_enquiries")
      .select("id, listing_id, funding, timing, message, docs_shared_at, read_at, thread_at, created_at, buyer:profiles!sale_enquiries_buyer_id_fkey(id, full_name, headline, avatar_url, member_type)")
      .in("listing_id", listings.map((l) => l.id))
      .order("created_at", { ascending: false });
    for (const r of (en ?? []) as unknown as (Omit<Enquiry, "buyer"> & { buyer: P | null })[]) {
      if (!r.buyer) continue;
      (enquiries[r.listing_id] ??= []).push({ ...r, buyer: person(r.buyer) });
    }
  }
  return { listings, enquiries };
}

export async function loadListingRow(id: string): Promise<ListingRow | null> {
  const { supabase } = await getViewer();
  const { data } = await supabase.from("sale_listings").select("*").eq("id", id).maybeSingle();
  return (data as ListingRow | null) ?? null;
}

export type TeamRow = ListingRow & { seller: SalePerson & { plan: string }; reports: number };

/** The team's queue: reported first, then not yet checked, then newest. */
export async function loadTeam(): Promise<TeamRow[]> {
  const { supabase } = await getViewer();
  const [{ data }, { data: rep }] = await Promise.all([
    supabase.from("sale_listings").select("*, seller:profiles!sale_listings_seller_id_fkey(id, full_name, headline, avatar_url, member_type, plan)"),
    supabase.from("sale_reports").select("listing_id"),
  ]);
  const counts = new Map<string, number>();
  for (const r of (rep ?? []) as { listing_id: string }[]) counts.set(r.listing_id, (counts.get(r.listing_id) ?? 0) + 1);
  const rows = ((data ?? []) as unknown as (ListingRow & { seller: P | null })[]).map((l) => ({
    ...l, seller: { ...person(l.seller ?? { id: l.seller_id, full_name: "Member", headline: "", avatar_url: null }), plan: l.seller?.plan ?? "" }, reports: counts.get(l.id) ?? 0,
  }));
  return rows.sort((a, b) => b.reports - a.reports || Number(!!a.checked_at) - Number(!!b.checked_at) || b.created_at.localeCompare(a.created_at));
}
