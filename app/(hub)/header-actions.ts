"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";

/** Update 39: save or remove the member's own profile header. The database checks the pictures are theirs and the daily limit. */
type Result = { ok: true } | { ok: false; error: string };
const OURS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/`;

function friendly(message: string): string {
  if (message.includes("header_limit")) return "You can change your header 10 times a day. Try again tomorrow.";
  if (message.includes("profiles_header_ours")) return "That picture could not be used. Please upload it again.";
  if (message.includes("column") && message.includes("header")) return "Header editing is almost ready. Please try again later.";
  return "Could not save your header. Check your connection and try again.";
}

export async function saveHeader(
  input: { kind: "photo"; url: string; src: string; crop: { x: number; y: number; z: number } } | { kind: "colour"; colour: number },
): Promise<Result> {
  const { supabase, userId } = await requireUser();
  let patch: Record<string, unknown>;
  if (input.kind === "colour") {
    const c = Math.round(Number(input.colour));
    if (!(c >= 0 && c <= 7)) return { ok: false, error: "Choose one of the colours." };
    patch = { header_colour: c, header_url: null, header_src: null, header_crop: null };
  } else {
    const mine = `${OURS}${userId}/`;
    if (!input.url?.startsWith(mine) || !input.src?.startsWith(mine)) return { ok: false, error: "That picture could not be used. Please upload it again." };
    const n = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
    const crop = { x: n(input.crop?.x, 0, 100), y: n(input.crop?.y, 0, 100), z: n(input.crop?.z, 1, 2.5) };
    patch = { header_url: input.url, header_src: input.src, header_crop: crop, header_colour: null };
  }
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath(`/members/${userId}`);
  revalidatePath("/profile/edit");
  return { ok: true };
}

export async function removeHeader(): Promise<Result> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profiles").update({ header_url: null, header_src: null, header_crop: null, header_colour: null }).eq("id", userId);
  if (error) return { ok: false, error: friendly(error.message) };
  revalidatePath(`/members/${userId}`);
  revalidatePath("/profile/edit");
  return { ok: true };
}
