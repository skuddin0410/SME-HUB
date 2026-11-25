"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { CLAIMS, SECTION_SCENE } from "@/lib/pavilion";

export type PavResult = { ok?: boolean; error?: string };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const PROV = /,\s*(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/;

/** "Exhibit your product free": a new listing, which the Hub team reviews before it appears. */
export async function submitListing(input: { name: string; what: string; section: string; claim: string; confirm: boolean; by?: string }): Promise<PavResult> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to exhibit." };
  const name = String(input.name ?? "").trim().slice(0, 80);
  const what = String(input.what ?? "").trim().slice(0, 200);
  if (!name || !what) return { error: "Add a name and one sentence about what you do" };
  if (what.length < 10) return { error: "Tell people a little more about what you make or do" };
  if (!["make", "serv", "soft"].includes(input.section)) return { error: "Choose a section" };
  if (!(input.claim in CLAIMS)) return { error: "Choose your Canadian claim" };
  if (!input.confirm) return { error: "Please tick the box to confirm your claim" };
  const loc = String((v.profile as { location?: string | null } | null)?.location ?? "").trim();
  const province = PROV.exec(loc)?.[1] ?? "";
  const { error } = await v.supabase.from("pavilion_listings").insert({
    owner_id: v.userId, name, what, section: input.section, claims: [input.claim], by_name: String(input.by ?? "").trim().slice(0, 80),
    city: loc.slice(0, 60), province, scene: SECTION_SCENE[input.section] ?? "awning", ai: input.section === "soft",
  });
  if (error) return { error: /up to 5/.test(error.message) ? "You can have up to 5 listings in the pavilion." : "Your listing could not be sent. Try again." };
  revalidatePath("/pavilion");
  return { ok: true };
}

/** "Report a label that looks wrong". */
export async function reportLabel(listingId: string, claim: string, note: string): Promise<PavResult> {
  if (!isId(listingId) || !(claim in CLAIMS)) return { error: "Choose the label that looks wrong." };
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to report a label." };
  const { error } = await v.supabase.from("pavilion_reports").insert({ listing_id: listingId, reporter_id: v.userId, claim, note: String(note ?? "").slice(0, 500) });
  if (error && !/duplicate/.test(error.message)) return { error: "Your report could not be sent." };
  return { ok: true };
}

/** The Hub team: approve, remove, feature or unfeature, and close label reports. The owner can take their listing down. */
export async function pavilionAction(listingId: string, action: "approve" | "remove" | "feature" | "unfeature" | "resolve"): Promise<PavResult> {
  if (!isId(listingId)) return { error: "Unknown listing." };
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in first." };
  if (action !== "remove" && !v.isStaff) return { error: "For the Hub team." };
  const q = v.supabase.from("pavilion_listings");
  const { error } = action === "resolve"
    ? await v.supabase.from("pavilion_reports").update({ status: "resolved" }).eq("listing_id", listingId).eq("status", "open")
    : await q.update(action === "approve" ? { status: "published" } : action === "remove" ? { status: "removed" } : { featured: action === "feature" }).eq("id", listingId);
  if (error) return { error: "That didn’t save. Try again." };
  revalidatePath("/pavilion");
  return { ok: true };
}
