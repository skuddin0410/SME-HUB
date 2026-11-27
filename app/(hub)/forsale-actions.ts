"use server";

import { safetyPlain } from "@/lib/safety/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { siteUrl } from "@/lib/courses-mail";
import { saleMail, saversOf } from "@/lib/forsale-mail";
import { checkDraft, draftToRow, FS_FUND, FS_IND, FS_REPORT, FS_WHEN, money, priceText, PROVS, slugify, where, type Draft, type DraftErr, type SaleStatus } from "@/lib/forsale-shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (v: unknown) => {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("Not found");
  return v;
};
type R<T = object> = Promise<{ error?: string } & Partial<T>>;
const msg = (e: { message: string } | null | undefined) => (e ? { error: safetyPlain(e.message) ?? e.message.replace(/^.*?: /, "") } : {});
const abs = (site: string, u?: string | null) => (u ? (u.startsWith("/") ? site + u : u) : "");
const refresh = () => {
  revalidatePath("/for-sale", "layout");
  revalidatePath("/team/for-sale");
};

export async function toggleSaleSave(listingId: string): R<{ saved: boolean }> {
  id(listingId);
  const { supabase, userId } = await requireUser();
  const { data } = await supabase.from("sale_saves").select("listing_id").eq("member_id", userId).eq("listing_id", listingId).maybeSingle();
  const res = data
    ? await supabase.from("sale_saves").delete().eq("member_id", userId).eq("listing_id", listingId)
    : await supabase.from("sale_saves").insert({ member_id: userId, listing_id: listingId });
  if (res.error) return msg(res.error);
  refresh();
  return { saved: !data };
}

/** Contact the seller: saves the enquiry, starts the message thread (open sellers) and sends both emails. */
export async function enquire(listingId: string, fund: string, when: string, message: string, agreed: boolean): R {
  id(listingId);
  if (!FS_FUND.includes(fund) || !FS_WHEN.includes(when)) return { error: "Pick how you’ll pay and when." };
  const { supabase, userId, profile } = await requireUser();
  const { error } = await supabase.rpc("sale_enquire", { p_listing: listingId, p_funding: fund, p_timing: when, p_message: message, p_agreed: agreed });
  if (error) return msg(error);
  const { data: d } = await supabase.rpc("sale_detail", { p_key: listingId });
  const l = d as { slug: string; title: string; price: number; por: boolean } | null;
  // the seller's id is not given to buyers; the server looks it up with its own key for the email
  const { serviceClient } = await import("@/lib/supabase/service");
  const db = serviceClient();
  const site = siteUrl();
  if (l) {
    await saleMail("sale-enquiry-sent", userId, { buy_title: l.title, buy_price: priceText(l), buy_url: `${site}/for-sale/${l.slug}`, for_sale_url: `${site}/for-sale` }, `sale-enquiry-sent-${listingId}-${userId}`);
    const seller = db ? ((await db.from("sale_listings").select("seller_id").eq("id", listingId).maybeSingle()).data as { seller_id: string } | null)?.seller_id : null;
    if (seller) {
      await saleMail("sale-new-enquiry", seller, {
        sale_title: l.title, buyer_name: profile?.full_name ?? "A member", buyer_role: profile?.headline ?? "", buyer_photo_url: abs(site, profile?.avatar_url) || `${site}/email-assets/logo.png`,
        buyer_msg: message.trim(), buyer_fund: fund, buyer_when: when, reply_url: `${site}/for-sale/my-listings`, manage_url: `${site}/for-sale/my-listings`,
      }, `sale-new-enquiry-${listingId}-${userId}`);
    }
  }
  refresh();
  return {};
}

/** The seller replies: the conversation starts in Hub messages. */
export async function openThread(enquiryId: string): R<{ buyer: string }> {
  id(enquiryId);
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("sale_open_thread", { p_enquiry: enquiryId });
  if (error) return msg(error);
  return { buyer: data as string };
}

export async function shareDocs(enquiryId: string): R {
  id(enquiryId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("sale_share_docs", { p_enquiry: enquiryId });
  if (error) return msg(error);
  refresh();
  return {};
}

export async function enquiriesSeen(): R {
  const { supabase } = await requireUser();
  await supabase.rpc("sale_enquiries_seen");
  return {};
}

const STATUS_NEXT: SaleStatus[] = ["live", "offer", "paused", "sold"];

export async function setSaleStatus(listingId: string, status: SaleStatus): R {
  id(listingId);
  if (!STATUS_NEXT.includes(status)) return { error: "Not allowed" };
  const { supabase, userId } = await requireUser();
  const { data: before } = await supabase.from("sale_listings").select("status, title, slug, price, price_on_request").eq("id", listingId).eq("seller_id", userId).maybeSingle();
  if (!before) return { error: "You can’t change this listing." };
  const { error } = await supabase.from("sale_listings").update({ status }).eq("id", listingId).eq("seller_id", userId);
  if (error) return msg(error);
  if (status === "offer" && before.status !== "offer") await mailSavers(listingId, before.title, before.slug, priceText({ por: before.price_on_request, price: before.price }), "Under offer", "It’s now under offer");
  refresh();
  return {};
}

async function mailSavers(listingId: string, title: string, slug: string, was: string, now: string, change: string) {
  const site = siteUrl();
  for (const m of await saversOf(listingId)) {
    await saleMail("sale-saved-update", m, { saved_title: title, saved_old: was, saved_new: now, saved_change: change, saved_url: `${site}/for-sale/${slug}` }, `sale-saved-${listingId}-${m}-${Date.now()}`);
  }
}

export async function reportListing(listingId: string, reason: string): R {
  id(listingId);
  if (!FS_REPORT.includes(reason)) return { error: "Pick a reason." };
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("sale_reports").insert({ listing_id: listingId, reporter_id: userId, reason });
  if (error && !/duplicate|unique/i.test(error.message)) return msg(error);
  refresh();
  return {};
}

/** Publish a new listing, or save changes to one (the seller's, or any for the team). */
export async function publishListing(D: Draft): R<{ slug: string; err: DraftErr }> {
  const { supabase, userId, profile } = await requireUser();
  const err = checkDraft(D);
  if (Object.keys(err).length) return { err };
  if (!(FS_IND as readonly string[]).includes(D.ind) || !PROVS.some((p) => p[0] === D.prov)) return { error: "Pick an industry and a province." };
  const row = draftToRow(D);
  const site = siteUrl();
  if (D.id) {
    id(D.id);
    const { data: before } = await supabase.from("sale_listings").select("slug, title, price, price_on_request").eq("id", D.id).maybeSingle();
    if (!before) return { error: "You can’t edit this listing." };
    const { error } = await supabase.from("sale_listings").update(row).eq("id", D.id);
    if (error) return msg(error);
    if (!before.price_on_request && !row.price_on_request && row.price < before.price) {
      await mailSavers(D.id, row.title, before.slug, money(before.price), money(row.price), `The asking price dropped to ${money(row.price)}`);
    }
    refresh();
    return { slug: before.slug };
  }
  const { data: can } = await supabase.rpc("sale_can_list");
  if (!can) return { error: "Selling a business is for Plus members and Advisors." };
  const newId = crypto.randomUUID();
  const slug = slugify(row.title, newId);
  const { error } = await supabase.from("sale_listings").insert({ id: newId, slug, seller_id: userId, ...row });
  if (error) return msg(error);
  await saleMail("sale-listing-live", userId, {
    first_name: (profile?.full_name ?? "").split(/\s+/)[0] || "there", sale_title: row.title, sale_price: priceText({ por: row.price_on_request, price: row.price }),
    sale_area: where({ area: row.area_shown, province: row.province }), sale_name_status: row.confidential ? "Hidden until you share it" : "Shown on the listing",
    sale_url: `${site}/for-sale/${slug}`, manage_url: `${site}/for-sale/my-listings`,
  }, `sale-listing-live-${newId}`);
  refresh();
  return { slug };
}

// ---------- the Hub team ----------
export async function setChecked(listingId: string, on: boolean): R {
  id(listingId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("sale_set_checked", { p_id: listingId, p_on: on });
  if (error) return msg(error);
  refresh();
  return {};
}

export async function setHidden(listingId: string, hide: boolean): R {
  id(listingId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("sale_set_hidden", { p_id: listingId, p_hide: hide });
  if (error) return msg(error);
  refresh();
  return {};
}

/** Email notifications: the "Businesses for sale" group. */
export async function setSaleEmails(on: boolean): R {
  const { supabase, userId } = await requireUser();
  const res = on
    ? await supabase.from("email_opt_out").delete().eq("member_id", userId).eq("grp", "forsale")
    : await supabase.from("email_opt_out").upsert({ member_id: userId, grp: "forsale" }, { onConflict: "member_id,grp", ignoreDuplicates: true });
  if (res.error) return msg(res.error);
  revalidatePath("/settings");
  return {};
}
