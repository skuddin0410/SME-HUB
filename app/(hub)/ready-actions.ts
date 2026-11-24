"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/hub";
import { getBusinessSettings } from "@/lib/business-server";
import { draftFromSite } from "@/lib/ready-reader";
import { MAX_HELPS, directoryCategory, draftFromAnswers, readyCount, type Draft, type ReadyItems } from "@/lib/ready-shared";

export type ReadyResult = { error?: string; ok?: true; count?: number; ready?: boolean; slug?: string };

const isId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");

async function countNow(): Promise<{ count: number; ready: boolean }> {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("my_ready_items");
  const row = ((data ?? []) as (ReadyItems & { ready_count: number })[])[0];
  const count = row ? readyCount(row) : 0;
  return { count, ready: count === 5 };
}

function done(): Promise<ReadyResult> {
  revalidatePath("/", "layout");
  return countNow().then((c) => ({ ok: true as const, ...c }));
}

/** After the browser has uploaded the picture to storage, point the profile at it. */
export async function savePhoto(url: string): Promise<ReadyResult> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("profiles").update({ avatar_url: clean(url, 500) }).eq("id", userId);
  if (error) return { error: "We could not save that photo. Try a JPG or PNG." };
  return done();
}

export async function saveHeadline(title: string, biz: string): Promise<ReadyResult> {
  const { supabase, userId } = await requireUser();
  const t = clean(title, 60);
  const b = clean(biz, 100);
  if (!t || !b) return { error: "Add your role and business name" };
  const { error } = await supabase.from("profiles").update({ headline: `${t}, ${b}` }).eq("id", userId);
  if (error) return { error: "We could not save that. Try again." };
  return done();
}

export async function saveCity(city: string): Promise<ReadyResult> {
  const { supabase, userId } = await requireUser();
  const c = clean(city, 80);
  if (!c) return { error: "Add your city" };
  const { error } = await supabase.from("profiles").update({ location: c }).eq("id", userId);
  if (error) return { error: "We could not save that. Try again." };
  return done();
}

export async function saveHelps(tags: string[]): Promise<ReadyResult> {
  const { supabase, userId } = await requireUser();
  const list = [...new Set((Array.isArray(tags) ? tags : []).map((t) => clean(t, 40)).filter(Boolean))].slice(0, MAX_HELPS);
  if (!list.length) return { error: "Pick at least one" };
  const { error } = await supabase.from("profile_details").upsert({ user_id: userId, helps_with: list }, { onConflict: "user_id" });
  if (error) return { error: "We could not save that. Try again." };
  return done();
}

/** Headline in one step for the "Add a photo and headline first" window. */
export async function saveGate(title: string, biz: string): Promise<ReadyResult> {
  return saveHeadline(title, biz);
}

// ---------- the AI draft ----------

async function keepDraft(src: "web" | "questions", website: string, draft: Draft): Promise<string> {
  const { supabase, userId } = await requireUser();
  const id = crypto.randomUUID();
  await supabase.from("profile_drafts").insert({ id, member_id: userId, source: src, website: clean(website, 300), draft });
  return id;
}

/** Reads the website and drafts the profile. Nothing is saved to the profile until the member presses Save. */
export async function readWebsite(url: string, title: string, biz: string): Promise<{ error?: string; draft?: Draft; id?: string }> {
  const { profile } = await requireUser();
  const first = (profile?.full_name ?? "").split(" ")[0] || "I";
  const settings = await getBusinessSettings();
  try {
    const draft = await draftFromSite(clean(url, 300), { firstName: first, title: clean(title, 60) || "Owner", biz: clean(biz, 100) }, settings.categories);
    return { draft, id: await keepDraft("web", url, draft) };
  } catch {
    // an unreadable site, a refused address or a time-out all end in the same place: the 3 questions
    return { error: "We couldn’t read that website. Answer 3 quick questions instead." };
  }
}

export async function draftFromQuestions(a: { title: string; biz: string; city: string; helps: string }): Promise<{ error?: string; draft?: Draft; id?: string }> {
  const { profile } = await requireUser();
  if (!clean(a.biz, 100) || !clean(a.city, 80)) return { error: "Add your business name and city" };
  const draft = draftFromAnswers({ firstName: (profile?.full_name ?? "").split(" ")[0] || "I", title: clean(a.title, 60), biz: clean(a.biz, 100), city: clean(a.city, 80), helps: clean(a.helps, 300), src: "questions" });
  return { draft, id: await keepDraft("questions", "", draft) };
}

/** "Looks good, save": the profile fields and tags, and (when ticked) the business page as a draft with its services. */
export async function saveDraft(id: string, d: Draft, makeBusiness: boolean): Promise<ReadyResult> {
  const { supabase } = await requireUser();
  if (!clean(d.title, 60) || !clean(d.biz, 100)) return { error: "Add your role and business name" };
  const settings = await getBusinessSettings();
  const draft = {
    title: clean(d.title, 60),
    biz: clean(d.biz, 100),
    city: clean(d.city, 80),
    about: clean(d.about, 1000),
    helps: (d.helps ?? []).map((h) => clean(h, 40)).filter(Boolean).slice(0, MAX_HELPS),
    category: directoryCategory(clean(d.cat, 80), settings.categories),
    desc: clean(d.desc, 1000),
    services: (d.services ?? []).map((s) => clean(s, 80)).filter(Boolean).slice(0, 6),
  };
  const { error } = await supabase.rpc("apply_profile_draft", { p_draft_id: isId(id) ? id : crypto.randomUUID(), p_draft: draft, p_make_business: makeBusiness });
  if (error) {
    if (/category/i.test(error.message)) return { error: "Your business category is not on the list yet. Save without the business page, then add it from My Businesses." };
    return { error: error.message.length < 120 ? error.message : "We could not save that. Try again." };
  }
  return done();
}

// ---------- Member Spotlight ----------

const CONSENT = "CanadianSME can use my photo, business name and these answers in the magazine, newsletter and on social media.";

export async function applySpotlight(a: { q1: string; q2: string; q3: string; ok: boolean }): Promise<ReadyResult> {
  const { supabase, userId } = await requireUser();
  if (!clean(a.q1, 1500) || !clean(a.q2, 1500)) return { error: "Answer the first two questions" };
  if (!a.ok) return { error: "Tick the box so CanadianSME can feature you" };
  const { error } = await supabase.from("spotlight_applications").insert({ member_id: userId, answers: { q1: clean(a.q1, 1500), q2: clean(a.q2, 1500), q3: clean(a.q3, 1500) }, consent_wording: CONSENT });
  if (error) {
    if (error.code === "23505") return { error: "You already have an application open." };
    return { error: "Finish your profile to apply." };
  }
  revalidatePath("/spotlight");
  return { ok: true };
}

// ---------- the Hub team ----------

export async function setFollowup(member: string, status: string): Promise<ReadyResult> {
  const { supabase, isStaff } = await requireUser();
  if (!isStaff || !isId(member)) return { error: "Team only" };
  const { error } = await supabase.rpc("set_followup", { p_member: member, p_status: status });
  if (error) return { error: "We could not save that." };
  revalidatePath("/profilefollow");
  return { ok: true };
}

const SETUP_MESSAGE = "Hi, this is the SME Hub team. I can set up your profile for you in 5 minutes. Reply here and we will do it together.";

export async function messageMember(member: string): Promise<ReadyResult> {
  const { supabase, isStaff } = await requireUser();
  if (!isStaff || !isId(member)) return { error: "Team only" };
  const { error } = await supabase.rpc("team_message_member", { p_member: member, p_body: SETUP_MESSAGE });
  if (error) return { error: "We could not send that message." };
  revalidatePath("/profilefollow");
  return { ok: true };
}

export async function chooseSpotlight(applicationId: string, memberId: string): Promise<ReadyResult> {
  const { supabase, userId, isStaff } = await requireUser();
  if (!isStaff || !isId(applicationId) || !isId(memberId)) return { error: "Team only" };
  const { error } = await supabase.from("spotlight_applications").update({ status: "chosen", chosen_by: userId, chosen_at: new Date().toISOString() }).eq("id", applicationId).eq("status", "received");
  if (error) return { error: "We could not save that." };
  await supabase.rpc("team_message_member", { p_member: memberId, p_body: "You’re in the next CanadianSME Member Spotlight. The editorial team will be in touch with the next steps. Keep your profile up to date in the meantime." });
  revalidatePath("/profilefollow");
  revalidatePath("/spotlight");
  return { ok: true };
}

// ---------- the real signal for the yellow line ----------

/** One row per Business Directory search by a signed-in member. Never throws: a failed log must not break a search. */
export async function logDirectorySearch(q: string, category: string, city: string, province: string) {
  try {
    const { supabase, userId } = await requireUser();
    if (!q && !category && !city && !province) return;
    await supabase.from("directory_searches").insert({ searcher_id: userId, q: clean(q, 100), category: clean(category, 80), city: clean(city, 80), province: clean(province, 2).toUpperCase() });
  } catch {
    /* ignore */
  }
}
