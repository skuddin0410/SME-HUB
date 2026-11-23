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
