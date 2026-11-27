"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";

/** Update 31: the member's own business card. Every choice saves straight away. */
type Result = { ok: true } | { ok: false; error: string };
export type CardPatch = Partial<{
  style: "classic" | "midnight" | "maple" | "minimal";
  show_title: boolean;
  show_business: boolean;
  show_city: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_website: boolean;
  title: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  searchable: boolean;
  active: boolean;
}>;

const BOOL = ["show_title", "show_business", "show_city", "show_phone", "show_email", "show_website", "searchable", "active"] as const;

export async function saveCard(patch: CardPatch): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const row: Record<string, unknown> = { member_id: userId };
  if (patch.style !== undefined) {
    if (!["classic", "midnight", "maple", "minimal"].includes(patch.style)) return { ok: false, error: "Choose one of the styles." };
    row.style = patch.style;
  }
  for (const k of BOOL) if (patch[k] !== undefined) row[k] = patch[k] === true;
  const text = (v: string | null | undefined, max: number) => (v == null ? null : v.trim().slice(0, max) || null);
  if (patch.title !== undefined) row.title = text(patch.title, 80);
  if (patch.phone !== undefined) {
    const p = text(patch.phone, 25);
    if (p && !/^[0-9+()\-. ]{7,25}$/.test(p)) return { ok: false, error: "That phone number doesn’t look right." };
    row.phone = p;
  }
  if (patch.email !== undefined) {
    const e = text(patch.email, 254);
    if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "That email doesn’t look right." };
    row.email = e;
  }
  if (patch.website !== undefined) {
    const w = text(patch.website, 200);
    if (w && /[\s<>"]/.test(w)) return { ok: false, error: "That website doesn’t look right." };
    row.website = w;
  }
  const { error } = await supabase.from("business_cards").upsert(row, { onConflict: "member_id" });
  if (error) return { ok: false, error: error.message.includes("business_cards") ? "Business cards are almost ready. Please try again later." : "Could not save that. Try again." };
  revalidatePath("/mycard");
  return { ok: true };
}
