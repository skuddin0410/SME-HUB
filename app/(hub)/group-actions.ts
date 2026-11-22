"use server";

import { requireStaff, requireUser, slugify } from "@/lib/hub";
import { GROUP_COVERS } from "@/lib/groups";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type GroupState = { error?: string; ok?: boolean; info?: string };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const flag = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "1";
const refresh = () => revalidatePath("/", "layout");
const wrap = (message: string) => (message.length < 160 ? message : "Something went wrong. Please try again.");

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid id");
  return value;
}

/** Friendly wording for the database rules a member can run into. */
function explain(message: string) {
  if (/group\.private|plan/i.test(message)) return "Private groups need a paid plan. Upgrade, or start a public group.";
  if (/violates row-level|permission/i.test(message)) return "You do not have permission to do that.";
  if (/rate|too many/i.test(message)) return "You are doing that too often. Try again later.";
  return wrap(message);
}

const cover = (form: FormData) => (GROUP_COVERS as readonly string[]).includes(text(form, "cover")) ? text(form, "cover") : "nodes";
const joinMode = (form: FormData) => (["open", "request", "invite"].includes(text(form, "join_mode")) ? text(form, "join_mode") : "request");

export async function createGroupV2(_prev: GroupState, form: FormData): Promise<GroupState> {
  const { supabase, userId } = await requireUser();
  const name = text(form, "name").slice(0, 80);
  if (name.length < 3) return { error: "Give the group a name of at least 3 characters." };
  const isPrivate = flag(form, "is_private");
  const slug = `${slugify(name) || "group"}-${crypto.randomUUID().slice(0, 4)}`;
  const { error } = await supabase.from("groups").insert({
    name,
    slug,
    description: text(form, "description").slice(0, 500),
    is_private: isPrivate,
    category: text(form, "category") || "Topic",
    cover: cover(form),
    join_mode: isPrivate ? (joinMode(form) === "open" ? "request" : joinMode(form)) : "open",
    created_by: userId,
  });
  if (error) return { error: explain(error.message) };
  const { data: row } = await supabase.from("groups").select("status").eq("slug", slug).maybeSingle();
  refresh();
  if (row?.status === "pending") return { ok: true, info: "Thanks. The team will review your group before it goes live." };
  redirect(`/groups/${slug}`);
}

export async function requestToJoin(groupId: string, _prev: GroupState, form: FormData): Promise<GroupState> {
  uuid(groupId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("group_join_requests")
    .upsert({ group_id: groupId, user_id: userId, message: text(form, "message").slice(0, 300), status: "pending" });
  if (error) return { error: explain(error.message) };
  refresh();
  return { ok: true, info: "Request sent. A moderator will review it." };
}

export async function cancelJoinRequest(groupId: string) {
  uuid(groupId);
  const { supabase, userId } = await requireUser();
  await supabase.from("group_join_requests").delete().eq("group_id", groupId).eq("user_id", userId);
  refresh();
}

export async function decideRequest(groupId: string, memberId: string, approve: boolean) {
  uuid(groupId);
  uuid(memberId);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("decide_group_request", { p_group: groupId, p_user: memberId, p_approve: approve });
  if (error) throw new Error("Only a moderator can decide requests.");
  refresh();
}

export async function setMemberRole(groupId: string, memberId: string, role: "member" | "moderator") {
  uuid(groupId);
  uuid(memberId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", memberId);
  if (error) throw new Error("Only a group admin can change roles.");
  refresh();
}

export async function removeMember(groupId: string, memberId: string) {
  uuid(groupId);
  uuid(memberId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberId);
  if (error) throw new Error("You cannot remove that member.");
  refresh();
}

export async function saveGroup(groupId: string, _prev: GroupState, form: FormData): Promise<GroupState> {
  uuid(groupId);
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = {
    description: text(form, "description").slice(0, 500),
    rules: text(form, "rules").slice(0, 2000),
    cover: cover(form),
    category: text(form, "category") || "Topic",
  };
  if (form.get("join_mode") !== null) update.join_mode = joinMode(form);
  const { error } = await supabase.from("groups").update(update).eq("id", groupId);
  if (error) return { error: explain(error.message) };
  refresh();
  return { ok: true, info: "Saved." };
}

export async function setGroupArchived(groupId: string, archived: boolean) {
  uuid(groupId);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("groups").update({ status: archived ? "archived" : "active" }).eq("id", groupId);
  if (error) throw new Error("Archiving is not available for this group.");
  refresh();
}

export async function messageMembers(groupId: string, _prev: GroupState, form: FormData): Promise<GroupState> {
  uuid(groupId);
  const { supabase } = await requireUser();
  const body = text(form, "body").slice(0, 2000);
  if (!body) return { error: "Write a message first." };
  const { data, error } = await supabase.rpc("message_group_members", { p_group: groupId, p_body: body });
  if (error) return { error: /3|limit|many/i.test(error.message) ? "You can send three group messages a day." : "Messaging all members is not available." };
  return { ok: true, info: `Sent to ${data ?? 0} members.` };
}

// ---------- team ----------
export async function saveGroupSettings(_prev: GroupState, form: FormData): Promise<GroupState> {
  const { supabase } = await requireStaff();
  const types = [...new Set(text(form, "types").split("\n").map((l) => l.trim()).filter(Boolean))].slice(0, 12);
  if (!types.length) return { error: "Keep at least one group type." };
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => (allowed as readonly string[]).includes(text(form, key)) ? (text(form, key) as T) : fallback;
  const { error } = await supabase
    .from("group_settings")
    .update({
      create_private: pick("create_private", ["paid", "all", "off"], "paid"),
      create_public: pick("create_public", ["approval", "all", "off"], "approval"),
      priv_join: pick("priv_join", ["request", "invite"], "request"),
      layout: pick("layout", ["grid", "list"], "grid"),
      header: pick("header", ["side", "top"], "side"),
      def_cover: pick("def_cover", GROUP_COVERS, "nodes"),
      card: { cat: flag(form, "card_cat"), desc: flag(form, "card_desc"), count: flag(form, "card_count"), act: flag(form, "card_act"), host: flag(form, "card_host") },
      head: { type: flag(form, "head_type"), priv: flag(form, "head_priv"), desc: flag(form, "head_desc"), faces: flag(form, "head_faces"), act: flag(form, "head_act") },
      msg_all: flag(form, "msg_all"),
      archive: flag(form, "archive"),
      types,
    })
    .eq("id", true);
  if (error) return { error: wrap(error.message) };
  refresh();
  return { ok: true, info: "Settings saved." };
}

export async function decideGroupApproval(groupId: string, approve: boolean) {
  uuid(groupId);
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("groups").update({ status: approve ? "active" : "rejected" }).eq("id", groupId);
  if (error) throw new Error("Could not update that group.");
  refresh();
}
