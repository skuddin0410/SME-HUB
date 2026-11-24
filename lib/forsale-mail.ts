import "server-only";
import { courseMail, memberEmail, siteUrl } from "@/lib/courses-mail";
import { serviceClient } from "@/lib/supabase/service";

export const FS_REASON = "you use Businesses for sale on SME Hub";

/** Members who turned off "Businesses for sale" in Email notifications get none of these. */
async function optedOut(id: string) {
  const db = serviceClient();
  if (!db) return false;
  const { data } = await db.from("email_opt_out").select("member_id").eq("member_id", id).eq("grp", "forsale").maybeSingle();
  return !!data;
}

/** Sends one Businesses for sale email to a member. Never throws. */
export async function saleMail(template: string, memberId: string, vars: Record<string, unknown>, key?: string) {
  try {
    if (await optedOut(memberId)) return;
    const site = siteUrl();
    await courseMail(template, await memberEmail(memberId), { reason: FS_REASON, unsubscribe_url: `${site}/settings#email-notifications`, ...vars }, key);
  } catch (e) {
    console.error(`for-sale email ${template}:`, (e as Error).message);
  }
}

/** The members who saved a listing, for the "saved listing changed" email. Needs the server's service key. */
export async function saversOf(listingId: string): Promise<string[]> {
  const db = serviceClient();
  if (!db) return [];
  const { data } = await db.from("sale_saves").select("member_id").eq("listing_id", listingId);
  return ((data ?? []) as { member_id: string }[]).map((r) => r.member_id);
}
