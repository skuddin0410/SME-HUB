"use server";

import { mayCloseAccount } from "@/lib/zip/profile-rules";
import { cleanAnswer, customFields } from "@/lib/zip/profile-fields";
import { getHubSettings } from "@/lib/zip/settings-load";
import { requireUser } from "@/lib/hub";
import { cleanSocialUrl, SELF_TYPES, SOCIAL_NETWORKS, splitList, VISIBILITY_FIELDS, VISIBILITY_LEVELS, AVAILABILITY, RELATIONSHIPS, INDUSTRIES, TEAM_SIZES, type CoreAnswers } from "@/lib/profile-extra";
import type { Field } from "@/lib/zip/settings";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type NetState = { error?: string; ok?: number };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function uuid(v: string) {
  if (!isId(v)) throw new Error("Invalid id");
  return v;
}
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/**
 * Saves one section of the extra profile fields: "about" (helps with, looking for, availability, social links, type)
 * or "privacy" (who sees what, private browsing). A section only changes its own columns.
 */
export async function saveDetails(_prev: NetState, form: FormData): Promise<NetState> {
  const { supabase, userId } = await requireUser();
  const section = text(form, "section");
  const ps0 = await getHubSettings("profiles");
  const row: Record<string, unknown> = { user_id: userId };

  if (section === "about") {
    const social_links: Record<string, string> = {};
    const nets = (await getHubSettings("profiles")).nets as Record<string, boolean>;
    for (const [key, label] of SOCIAL_NETWORKS) {
      if (nets[key] === false) continue;
      const raw = text(form, `social_${key}`);
      if (!raw) continue;
      const url = cleanSocialUrl(raw);
      if (!url) return { error: `${label} needs to be a web address, like linkedin.com/in/yourname.` };
      social_links[key] = url;
    }
    row.helps_with = splitList(text(form, "helps_with"));
    row.needs = splitList(text(form, "needs"));
    row.availability = form.getAll("availability").map(String).filter((a) => (AVAILABILITY as readonly string[]).includes(a));
    row.social_links = social_links;
    // questions the team added; locked ones cannot be changed by members, so their saved answer is kept
    const answers: Record<string, string> = { ...(((await supabase.from("profile_details").select("custom_fields").eq("user_id", userId).maybeSingle()).data as { custom_fields?: Record<string, string> } | null)?.custom_fields ?? {}) };
    for (const fld of customFields(ps0.fields)) {
      if (fld.lock) continue;
      const v = cleanAnswer(fld.t, text(form, `custom_${fld.k}`));
      if (v === null) delete answers[fld.k];
      else answers[fld.k] = v;
    }
    row.custom_fields = answers;
    // the built-in Details answers
    const core: CoreAnswers = {};
    const nick = text(form, "core_nick").slice(0, 60);
    if (nick) core.nick = nick;
    const ind = text(form, "core_industry");
    if ((INDUSTRIES as readonly string[]).includes(ind)) core.industry = ind;
    const founded = text(form, "core_founded");
    if (founded) {
      if (!/^(18|19|20)\d\d$/.test(founded) || Number(founded) > new Date().getFullYear()) return { error: "Year founded needs to be a year, like 2012." };
      core.founded = founded;
    }
    const team = text(form, "core_team");
    if ((TEAM_SIZES as readonly string[]).includes(team)) core.team = team;
    const email = text(form, "core_email").slice(0, 120);
    if (email) {
      if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email)) return { error: "That contact email does not look right." };
      core.email = email;
    }
    const phone = text(form, "core_phone");
    if (phone) {
      if (!/^[0-9+()\-. ]{7,25}$/.test(phone)) return { error: "That phone number does not look right." };
      core.phone = phone;
    }
    const roles = form.getAll("core_h_role").map(String), orgs = form.getAll("core_h_org").map(String), years = form.getAll("core_h_years").map(String);
    const history = roles.map((r, i) => ({ role: r.trim().slice(0, 80), org: (orgs[i] ?? "").trim().slice(0, 80), years: (years[i] ?? "").trim().slice(0, 40) })).filter((h) => h.role).slice(0, 6);
    if (history.length) core.history = history;
    row.core = core;
  } else if (section === "privacy") {
    const visibility: Record<string, string> = {};
    for (const [field] of VISIBILITY_FIELDS) {
      const v = text(form, `vis_${field}`);
      if (v in VISIBILITY_LEVELS && v !== "public") visibility[field] = v;
    }
    // the Details fields the team left unlocked: a choice is kept only when it differs from the team's default
    for (const f of ((ps0.fields ?? []) as Field[]).filter((x) => !x.lock && x.k !== "social")) {
      const v = text(form, `vis_${f.k}`);
      if (v in VISIBILITY_LEVELS && v !== f.vis) visibility[f.k] = v;
    }
    row.visibility = visibility;
    row.private_browsing = form.get("private_browsing") === "on";
  } else {
    return { error: "Nothing to save." };
  }

  const { error } = await supabase.from("profile_details").upsert(row);
  if (error) return { error: error.message };

  const type = text(form, "profile_type");
  if (section === "about" && (SELF_TYPES as readonly string[]).includes(type)) {
    const res = await supabase.from("profiles").update({ profile_type: type }).eq("id", userId);
    if (res.error) return { error: res.error.message };
  }
  if (section === "about") {
    // groups the team set for this profile type are joined on day one (public groups only; the database decides)
    const ps = await getHubSettings("profiles");
    let t = type;
    if (!(SELF_TYPES as readonly string[]).includes(t)) t = ((await supabase.from("profiles").select("profile_type").eq("id", userId).maybeSingle()).data as { profile_type?: string } | null)?.profile_type ?? "owner";
    const ids = ((ps.auto as Record<string, string[]>)[t] ?? []).filter((x) => /^[0-9a-f-]{36}$/i.test(x));
    if (ids.length) await supabase.from("group_members").upsert(ids.map((g) => ({ group_id: g, user_id: userId })), { ignoreDuplicates: true });
  }
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function toggleFollow(otherId: string, following: boolean) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  if (!following && !(await getHubSettings("profiles")).follow) throw new Error("Following is turned off.");
  if (following) fail((await supabase.from("follows").delete().eq("follower_id", userId).eq("followee_id", otherId)).error);
  else fail((await supabase.from("follows").insert({ follower_id: userId, followee_id: otherId })).error);
  revalidatePath(`/members/${otherId}`);
}

export async function writeRecommendation(subjectId: string, relationship: string, body: string): Promise<NetState> {
  uuid(subjectId);
  const { supabase, userId } = await requireUser();
  if (!(relationship in RELATIONSHIPS)) return { error: "Pick how you know them." };
  const text = body.trim();
  if (text.length < 20) return { error: "Write at least 20 characters." };
  if (text.length > 1000) return { error: "Keep it under 1,000 characters." };
  const { error } = await supabase.from("recommendations").upsert({ author_id: userId, subject_id: subjectId, relationship, body: text }, { onConflict: "author_id,subject_id" });
  if (error) return { error: error.message.includes("row-level") ? "You can only recommend your connections." : error.message };
  await supabase.from("recommendation_requests").delete().eq("requester_id", subjectId).eq("asked_id", userId);
  revalidatePath(`/members/${subjectId}`);
  return { ok: Date.now() };
}

export async function setRecommendationHidden(id: string, subjectId: string, hidden: boolean) {
  uuid(id);
  uuid(subjectId);
  const { supabase } = await requireUser();
  fail((await supabase.from("recommendations").update({ hidden }).eq("id", id)).error);
  revalidatePath(`/members/${subjectId}`);
}

export async function deleteRecommendation(id: string, subjectId: string) {
  uuid(id);
  uuid(subjectId);
  const { supabase } = await requireUser();
  fail((await supabase.from("recommendations").delete().eq("id", id)).error);
  revalidatePath(`/members/${subjectId}`);
}

export async function requestRecommendation(askedId: string): Promise<NetState> {
  uuid(askedId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("recommendation_requests").insert({ requester_id: userId, asked_id: askedId });
  if (error && error.code !== "23505") return { error: "You can only ask your connections." };
  return { ok: Date.now() };
}

export async function askIntro(viaId: string, targetId: string, note: string): Promise<NetState> {
  uuid(viaId);
  uuid(targetId);
  const { supabase, userId } = await requireUser();
  const n = note.trim();
  if (!n) return { error: "Add a short note so they know why." };
  const { error } = await supabase.from("intro_requests").insert({ requester_id: userId, via_id: viaId, target_id: targetId, note: n.slice(0, 500) });
  if (error) {
    if (error.code === "23505") return { error: "You already asked for this introduction." };
    if (error.message.includes("profile_not_ready")) return { error: "Add a photo and headline first." };
    if (error.message.includes("at most 5")) return { error: "You can ask for 5 introductions a day." };
    return { error: "That introduction is not possible right now." };
  }
  return { ok: Date.now() };
}

export async function answerIntro(id: string, accept: boolean) {
  uuid(id);
  const { supabase } = await requireUser();
  fail((await supabase.from("intro_requests").update({ status: accept ? "accepted" : "declined" }).eq("id", id)).error);
  revalidatePath("/", "layout");
}

export async function unblockMember(otherId: string) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  fail((await supabase.from("blocks").delete().eq("blocker_id", userId).eq("blocked_id", otherId)).error);
  revalidatePath("/settings");
}

/** Deletes the account through the database; no secret key lives in the website. */
export async function deleteAccount(_prev: NetState, form: FormData): Promise<NetState> {
  const { supabase, userId } = await requireUser();
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (!mayCloseAccount(await getHubSettings("profiles"), (me as { plan?: string } | null)?.plan)) return { error: "Please ask the Hub team to close your account." };
  if (text(form, "confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message };
  await (await createClient()).auth.signOut();
  redirect("/?deleted=1");
}
