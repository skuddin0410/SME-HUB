"use server";

import { requireStaff, requireUser, slugify } from "@/lib/hub";
import { parseHours, websiteUrl, SOCIALS, type Role } from "@/lib/business";
import { getBusinessSettings } from "@/lib/business-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BizState = { error?: string; ok?: boolean };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const flag = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "1";

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid id");
  return value;
}

/** A picture the browser already uploaded, accepted only from this member's own storage folder. */
function ownUpload(form: FormData, field: string, userId: string): string | null {
  const url = text(form, field);
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${userId}/`;
  if (!url.startsWith(prefix) || !/^[a-z]+-[0-9a-f-]{36}\.(jpg|png)$/.test(url.slice(prefix.length))) throw new Error("That picture cannot be used.");
  return url;
}

const refresh = () => revalidatePath("/", "layout");
const wrap = (message: string) => (message.length < 160 ? message : "Something went wrong. Please try again.");

// ---------- the page itself ----------
export async function saveBusiness(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase, userId, profile } = await requireUser();
  if (!profile) return { error: "Finish your profile first." };
  const id = text(form, "id") ? uuid(text(form, "id")) : "";
  const name = text(form, "name").slice(0, 100);
  if (!name) return { error: "Add the business name." };
  const kind = ["storefront", "service", "online"].includes(text(form, "kind")) ? text(form, "kind") : "storefront";
  const fields: Record<string, unknown> = {
    name,
    kind,
    category: text(form, "category"),
    city: text(form, "city").slice(0, 80),
    province: text(form, "province").toUpperCase().slice(0, 2),
    description: text(form, "description").slice(0, 1000),
    website: websiteUrl(text(form, "website")).slice(0, 200),
  };
  const logo = ownUpload(form, "logo_url", userId);
  if (logo) fields.logo_url = logo;
  const cover = ownUpload(form, "cover_url", userId);
  if (cover) fields.cover_url = cover;

  let slug: string;
  if (id) {
    const { data, error } = await supabase.from("companies").update(fields).eq("id", id).select("slug").maybeSingle();
    if (error) return { error: wrap(error.message) };
    if (!data) return { error: "You cannot edit this page." };
    slug = data.slug as string;
  } else {
    slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`;
    const { error } = await supabase.from("companies").insert({ ...fields, slug, owner_id: userId });
    if (error) return { error: wrap(error.message) };
  }
  refresh();
  redirect(text(form, "then") === "preview" ? `/businesses/${slug}` : `/businesses/mine/${slug}`);
}

export async function saveBusinessDetails(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase } = await requireUser();
  const id = uuid(text(form, "id"));
  const social: Record<string, string> = {};
  for (const s of SOCIALS) {
    const v = text(form, `social_${s}`).slice(0, 200);
    if (v) social[s] = websiteUrl(v);
  }
  const closures = text(form, "closures")
    .split(/[\s,]+/)
    .filter((d) => /^\d{4}-\d\d-\d\d$/.test(d))
    .slice(0, 60)
    .map((date) => ({ date }));
  const action = ["message", "call", "web", "book"].includes(text(form, "primary_action")) ? text(form, "primary_action") : "message";
  const { error } = await supabase
    .from("companies")
    .update({
      about: text(form, "about").slice(0, 2000),
      tz: text(form, "tz").slice(0, 40) || "America/Toronto",
      service_area: text(form, "service_area").slice(0, 120),
      show_address: flag(form, "show_address"),
      show_email: flag(form, "show_email"),
      show_phone: flag(form, "show_phone"),
      show_whatsapp: flag(form, "show_whatsapp"),
      booking_url: websiteUrl(text(form, "booking_url")).slice(0, 200),
      primary_action: action,
      appointments: flag(form, "appointments"),
      hours: parseHours(form),
      closures,
      social,
    })
    .eq("id", id);
  if (error) return { error: wrap(error.message) };
  const { error: privateError } = await supabase.from("business_private").upsert({
    company_id: id,
    street: text(form, "street").slice(0, 120),
    postal: text(form, "postal").slice(0, 10),
    email: text(form, "email").slice(0, 120),
    phone: text(form, "phone").slice(0, 30),
    whatsapp: text(form, "whatsapp").slice(0, 30),
  });
  if (privateError) return { error: wrap(privateError.message) };
  refresh();
  return { ok: true };
}

/** Draft or not approved -> waiting for approval (or live straight away when staff turned approval off). */
export async function submitBusiness(companyId: string) {
  uuid(companyId);
  const { supabase } = await requireUser();
  const settings = await getBusinessSettings();
  const { error } = await supabase.from("companies").update({ status: settings.pub_approval ? "pending" : "published" }).eq("id", companyId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function deleteBusiness(companyId: string) {
  uuid(companyId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

// ---------- services ----------
export async function saveService(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase, userId } = await requireUser();
  const companyId = uuid(text(form, "company_id"));
  const id = text(form, "id") ? uuid(text(form, "id")) : "";
  const name = text(form, "name").slice(0, 80);
  if (!name) return { error: "Name the service." };
  const type = ["fixed", "from", "quote"].includes(text(form, "price_type")) ? text(form, "price_type") : "quote";
  const price = text(form, "price") === "" ? null : Number(text(form, "price"));
  if (type !== "quote" && (price == null || Number.isNaN(price) || price < 0)) return { error: "Add a price, or choose Ask for a quote." };
  const row: Record<string, unknown> = { company_id: companyId, name, description: text(form, "description").slice(0, 300), price_type: type, price: type === "quote" ? null : price };
  const photo = ownUpload(form, "photo_url", userId);
  if (photo) row.photo_url = photo;
  const { error } = id ? await supabase.from("business_services").update(row).eq("id", id) : await supabase.from("business_services").insert(row);
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteService(serviceId: string) {
  uuid(serviceId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("business_services").delete().eq("id", serviceId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

// ---------- photos, shop, jobs and events ----------
async function saveRow(table: string, form: FormData, row: Record<string, unknown>): Promise<BizState> {
  const { supabase } = await requireUser();
  const id = text(form, "id") ? uuid(text(form, "id")) : "";
  const { error } = id ? await supabase.from(table).update(row).eq("id", id) : await supabase.from(table).insert({ ...row, company_id: uuid(text(form, "company_id")) });
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true };
}

async function removeRow(table: string, id: string) {
  uuid(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function savePhoto(_prev: BizState, form: FormData): Promise<BizState> {
  const { userId } = await requireUser();
  const url = ownUpload(form, "url", userId);
  if (!url) return { error: "Choose a photo to upload." };
  return saveRow("business_photos", form, { url, caption: text(form, "caption").slice(0, 140) });
}
export const deletePhoto = async (id: string) => removeRow("business_photos", id);

export async function saveProduct(_prev: BizState, form: FormData): Promise<BizState> {
  const { userId } = await requireUser();
  const name = text(form, "name").slice(0, 80);
  const price = Number(text(form, "price"));
  if (!name) return { error: "Name the product." };
  if (text(form, "price") === "" || Number.isNaN(price) || price < 0) return { error: "Add a price." };
  const row: Record<string, unknown> = { name, price, description: text(form, "description").slice(0, 300), available: !flag(form, "sold_out") };
  const photo = ownUpload(form, "photo_url", userId);
  if (photo) row.photo_url = photo;
  return saveRow("business_products", form, row);
}
export const deleteProduct = async (id: string) => removeRow("business_products", id);

export async function saveJob(_prev: BizState, form: FormData): Promise<BizState> {
  const title = text(form, "title").slice(0, 100);
  if (!title) return { error: "Add the job title." };
  const type = ["full-time", "part-time", "contract", "seasonal", "internship"].includes(text(form, "job_type")) ? text(form, "job_type") : "full-time";
  return saveRow("business_jobs", form, {
    title,
    job_type: type,
    description: text(form, "description").slice(0, 1500),
    location: text(form, "location").slice(0, 100),
    apply_url: websiteUrl(text(form, "apply_url")).slice(0, 200),
    open: !flag(form, "closed"),
  });
}
export const deleteJob = async (id: string) => removeRow("business_jobs", id);

export async function saveEvent(_prev: BizState, form: FormData): Promise<BizState> {
  const title = text(form, "title").slice(0, 100);
  if (!title) return { error: "Add the event name." };
  // a local date-time plus the browser's offset in minutes becomes one exact moment
  const offset = Number(text(form, "tz_offset")) || 0;
  const at = (key: string) => {
    if (!text(form, key)) return null;
    const when = new Date(`${text(form, key)}:00Z`);
    return Number.isNaN(when.getTime()) ? undefined : new Date(when.getTime() + offset * 60_000).toISOString();
  };
  const starts = at("starts_local");
  const ends = at("ends_local");
  if (!starts) return { error: "Choose when the event starts." };
  if (ends === undefined) return { error: "That end time does not look right." };
  if (ends && ends < starts) return { error: "The event cannot end before it starts." };
  return saveRow("business_events", form, {
    title,
    starts_at: starts,
    ends_at: ends,
    description: text(form, "description").slice(0, 1000),
    location: text(form, "location").slice(0, 120),
    url: websiteUrl(text(form, "url")).slice(0, 200),
  });
}
export const deleteEvent = async (id: string) => removeRow("business_events", id);

// ---------- team ----------
export async function addTeamMember(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase } = await requireUser();
  const role = text(form, "role") as Role;
  if (!["manager", "editor", "responder"].includes(role)) return { error: "Choose a role." };
  const member = text(form, "member");
  if (!member) return { error: "Choose a connection to add." };
  const { error } = await supabase.from("business_team").insert({ company_id: uuid(text(form, "company_id")), user_id: uuid(member), role });
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true };
}

export async function setTeamRole(companyId: string, userId: string, role: string) {
  uuid(companyId);
  uuid(userId);
  if (!["manager", "editor", "responder"].includes(role)) throw new Error("Invalid role");
  const { supabase } = await requireUser();
  const { error } = await supabase.from("business_team").update({ role }).eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function removeTeamMember(companyId: string, userId: string) {
  uuid(companyId);
  uuid(userId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("business_team").delete().eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

// ---------- followers ----------
export async function toggleFollow(companyId: string, follow: boolean) {
  uuid(companyId);
  const { supabase, userId } = await requireUser();
  const { error } = follow
    ? await supabase.from("business_follows").upsert({ company_id: companyId, user_id: userId }, { ignoreDuplicates: true })
    : await supabase.from("business_follows").delete().eq("company_id", companyId).eq("user_id", userId);
  if (error) throw new Error(wrap(error.message));
  revalidatePath("/businesses", "layout");
}

// ---------- reviews ----------
export async function saveReview(companyId: string, criteria: Record<string, number>, body: string) {
  uuid(companyId);
  const { supabase, userId } = await requireUser();
  const settings = await getBusinessSettings();
  const clean: Record<string, number> = {};
  for (const c of settings.criteria) {
    const v = Math.round(Number(criteria[c]));
    if (v >= 1 && v <= 5) clean[c] = v;
  }
  const values = Object.values(clean);
  if (!values.length) throw new Error("Rate at least one thing.");
  const rating = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const { error } = await supabase.from("company_reviews").upsert({ company_id: companyId, author_id: userId, rating, criteria: clean, body: body.trim().slice(0, 1000) });
  if (error) throw new Error(wrap(error.message));
  revalidatePath("/businesses", "layout");
}

export async function deleteReview(companyId: string, authorId: string) {
  uuid(companyId);
  uuid(authorId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("company_reviews").delete().eq("company_id", companyId).eq("author_id", authorId);
  if (error) throw new Error(wrap(error.message));
  revalidatePath("/businesses", "layout");
}

export async function replyToReview(companyId: string, reviewAuthorId: string, body: string) {
  uuid(companyId);
  uuid(reviewAuthorId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim().slice(0, 1000);
  if (!clean) throw new Error("Write a reply first.");
  const { error } = await supabase.from("business_review_replies").upsert({ company_id: companyId, review_author_id: reviewAuthorId, author_id: userId, body: clean });
  if (error) throw new Error(wrap(error.message));
  revalidatePath("/businesses", "layout");
}

export async function removeReviewReply(companyId: string, reviewAuthorId: string) {
  uuid(companyId);
  uuid(reviewAuthorId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("business_review_replies").delete().eq("company_id", companyId).eq("review_author_id", reviewAuthorId);
  if (error) throw new Error(wrap(error.message));
  revalidatePath("/businesses", "layout");
}

// ---------- messages and quote requests ----------
export async function sendInquiry(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase, userId } = await requireUser();
  const companyId = uuid(text(form, "company_id"));
  const body = text(form, "body").slice(0, 2000);
  if (!body) return { error: "Write your message first." };
  const kind = text(form, "kind") === "quote" ? "quote" : "message";
  const { data, error } = await supabase.from("business_inquiries").insert({ company_id: companyId, sender_id: userId, kind }).select("id").single();
  if (error) return { error: wrap(error.message) };
  const { error: messageError } = await supabase.from("business_inquiry_messages").insert({ inquiry_id: data.id, author_id: userId, body });
  if (messageError) return { error: wrap(messageError.message) };
  refresh();
  return { ok: true };
}

export async function replyInquiry(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase, userId } = await requireUser();
  const inquiryId = uuid(text(form, "inquiry_id"));
  const body = text(form, "body").slice(0, 2000);
  if (!body) return { error: "Write your reply first." };
  const { error } = await supabase.from("business_inquiry_messages").insert({ inquiry_id: inquiryId, author_id: userId, body });
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true };
}

export async function setInquiryStatus(inquiryId: string, status: "open" | "closed") {
  uuid(inquiryId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("business_inquiries").update({ status }).eq("id", inquiryId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

// ---------- claiming a listing ----------
export async function claimBusiness(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase, userId } = await requireUser();
  const evidence = text(form, "evidence");
  if (evidence.length < 10) return { error: "Tell us how you are connected to this business (at least a sentence)." };
  const { error } = await supabase.from("business_claims").insert({ company_id: uuid(text(form, "company_id")), user_id: userId, evidence: evidence.slice(0, 1000) });
  if (error) return { error: error.code === "23505" ? "You already sent a claim for this business." : wrap(error.message) };
  refresh();
  return { ok: true };
}

// ---------- the team's review queue ----------
export async function decideClaim(claimId: string, approve: boolean) {
  uuid(claimId);
  const { supabase } = await requireStaff();
  const { error } = await supabase.rpc("decide_claim", { p_claim: claimId, p_approve: approve });
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function decideBusiness(companyId: string, approve: boolean) {
  uuid(companyId);
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("companies").update({ status: approve ? "published" : "rejected" }).eq("id", companyId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function decideReview(companyId: string, authorId: string, show: boolean) {
  uuid(companyId);
  uuid(authorId);
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("company_reviews").update({ status: show ? "published" : "hidden" }).eq("company_id", companyId).eq("author_id", authorId);
  if (error) throw new Error(wrap(error.message));
  refresh();
}

export async function saveBusinessSettings(_prev: BizState, form: FormData): Promise<BizState> {
  const { supabase } = await requireStaff();
  const lines = (key: string) => [...new Set(text(form, key).split("\n").map((l) => l.trim()).filter(Boolean))];
  const categories = lines("categories").slice(0, 40);
  const criteria = lines("criteria").slice(0, 6);
  if (!categories.length || !criteria.length) return { error: "Keep at least one category and one review criterion." };
  const { error } = await supabase
    .from("business_settings")
    .update({
      create_mode: text(form, "create_mode") === "paid" ? "paid" : "all",
      member_limit: Math.min(50, Math.max(0, Number(text(form, "member_limit")) || 0)),
      pub_approval: flag(form, "pub_approval"),
      review_approval: flag(form, "review_approval"),
      categories,
      criteria,
      tabs: { photos: flag(form, "tab_photos"), events: flag(form, "tab_events"), jobs: flag(form, "tab_jobs"), shop: flag(form, "tab_shop") },
    })
    .eq("id", true);
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true };
}
