"use server";

import { requireStaff } from "@/lib/hub";
import { revalidatePath } from "next/cache";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ids = (list: string[]) => list.filter((x) => UUID.test(x));
function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** One form for the whole moderation table: a row button sends op="verb:id", the Apply button sends bulk + the ticked rows. */
export async function moderate(form: FormData) {
  const { supabase } = await requireStaff();
  const op = text(form, "op");
  let verb: string;
  let targets: string[];
  if (op) {
    const [v, id] = op.split(":");
    verb = v;
    targets = ids([id ?? ""]);
  } else {
    verb = text(form, "bulk");
    targets = ids(form.getAll("sel").map(String));
  }
  if (!targets.length) return;

  if (verb === "hide" || verb === "show") {
    fail((await supabase.from("posts").update({ hidden_at: verb === "hide" ? new Date().toISOString() : null }).in("id", targets)).error);
  } else if (verb === "dismiss") {
    fail((await supabase.from("reports").update({ status: "resolved" }).in("post_id", targets).eq("status", "open")).error);
  } else if (verb === "suspend" || verb === "unsuspend") {
    fail((await supabase.from("profiles").update({ status: verb === "suspend" ? "suspended" : "active" }).in("id", targets)).error);
    if (verb === "unsuspend") fail((await supabase.from("reports").update({ status: "resolved" }).in("profile_id", targets).eq("status", "open")).error);
  } else if (verb === "clear") {
    fail((await supabase.from("reports").update({ status: "resolved" }).in("profile_id", targets).eq("status", "open")).error);
  }
  revalidatePath("/moderation");
}

const TYPES = ["post", "comment", "photo", "group", "blog", "blogc"];
const num = (v: string, min: number, max: number, d: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export async function saveModerationSettings(form: FormData) {
  const { supabase } = await requireStaff();
  const types: Record<string, { on: boolean; auto: boolean; hide: number }> = {};
  for (const t of TYPES) types[t] = { on: form.get(`on_${t}`) === "on", auto: form.get(`auto_${t}`) === "on", hide: num(text(form, `hide_${t}`), 1, 50, 3) };
  const row = {
    types,
    member_report: form.get("member_report") === "on",
    blocking: form.get("blocking") === "on",
    sus_blocks: { on: form.get("sus_blocks_on") === "on", n: num(text(form, "sus_blocks_n"), 1, 99, 5) },
    sus_reports: { on: form.get("sus_reports_on") === "on", n: num(text(form, "sus_reports_n"), 1, 99, 10) },
    email_on: form.get("email_on") === "on",
    email_subject: text(form, "email_subject").slice(0, 200),
    email_body: text(form, "email_body").slice(0, 2000),
    updated_at: new Date().toISOString(),
  };
  fail((await supabase.from("mod_settings").update(row).eq("id", true)).error);
  revalidatePath("/moderation");
}

export async function saveReportCategory(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "id");
  const name = text(form, "name").slice(0, 80);
  const description = text(form, "description").slice(0, 200);
  const show = ["content", "member", "both"].includes(text(form, "show")) ? text(form, "show") : "both";
  if (!name) return;
  if (id && UUID.test(id)) fail((await supabase.from("report_categories").update({ name, description, show }).eq("id", id)).error);
  else {
    const { data } = await supabase.from("report_categories").select("position").order("position", { ascending: false }).limit(1);
    fail((await supabase.from("report_categories").insert({ name, description, show, position: ((data?.[0]?.position as number | undefined) ?? 0) + 1 })).error);
  }
  revalidatePath("/moderation");
}

export async function deleteReportCategory(form: FormData) {
  const { supabase } = await requireStaff();
  const id = text(form, "id");
  if (!UUID.test(id)) return;
  fail((await supabase.from("report_categories").delete().eq("id", id)).error);
  revalidatePath("/moderation");
}

const PAGES = ["profiles", "feed", "groups", "blogs", "hashtags", "stories", "automations"];
export type SaveState = { error?: string; ok?: boolean };

/** One settings page = one row. The page sends its whole choices object as JSON. */
export async function saveHubSettings(key: string, json: string): Promise<SaveState> {
  const { supabase, userId } = await requireStaff();
  if (!PAGES.includes(key)) return { error: "Unknown settings page." };
  if (json.length > 30000) return { error: "These settings are too large to save." };
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return { error: "Those settings could not be read." };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Those settings could not be read." };
  const { error } = await supabase.from("hub_settings").upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId });
  if (error) return { error: "Could not save. Try again." };
  if (key === "groups") {
    // the database rules for creating groups read group_settings, so the two stay in step (admins only; staff keep the hub_settings copy)
    const g = value as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (g.create === "all" || g.create === "paid" || g.create === "advisor") patch.create_private = g.create === "all" ? "all" : "paid";
    if (g.privJoin === "invite" || g.privJoin === "request") patch.priv_join = g.privJoin;
    if (typeof g.msgAll === "boolean") patch.msg_all = g.msgAll;
    if (typeof g.archive === "boolean") patch.archive = g.archive;
    if (Object.keys(patch).length) await supabase.from("group_settings").update(patch).eq("id", true);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Posts a queued automation message to the feed from the team member's own account. */
export async function publishQueuedPost(body: string): Promise<SaveState> {
  const { supabase, userId } = await requireStaff();
  const t = body.trim();
  if (!t || t.length > 3000) return { error: "That post is empty or too long." };
  const { error } = await supabase.from("posts").insert({ author_id: userId, body: t, visibility: "members" });
  if (error) return { error: "Could not post. Try again." };
  revalidatePath("/feed");
  return { ok: true };
}

/** Business Profiles settings page: the choices go into the existing business_settings row. */
export async function saveBizSettings(json: string): Promise<SaveState> {
  const { supabase } = await requireStaff();
  let v: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { v = JSON.parse(json); } catch { return { error: "Those settings could not be read." }; }
  const list = (a: unknown, max: number) => [...new Set((Array.isArray(a) ? a : []).map((x) => String(x).trim()).filter(Boolean))].slice(0, max);
  const cats = list(v.cats, 40), crit = list(v.criteria, 6);
  if (!cats.length || !crit.length) return { error: "Keep at least one category and one review criterion." };
  const tabs = v.tabs ?? {};
  const { error } = await supabase.from("business_settings").update({
    create_mode: v.create === "paid" ? "paid" : "all",
    member_limit: Math.min(50, Math.max(0, Number(v.limit) || 0)),
    pub_approval: !!v.pubApproval,
    review_approval: !!v.revApproval,
    categories: cats,
    criteria: crit,
    tabs: { photos: !!tabs.photos, events: !!tabs.events, jobs: !!tabs.jobs, shop: !!tabs.shop },
  }).eq("id", true);
  if (error) return { error: "Could not save. Only admins can change these." };
  revalidatePath("/", "layout");
  return { ok: true };
}
