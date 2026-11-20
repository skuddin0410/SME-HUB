"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCms, isUuid } from "@/lib/cms";
import { slugify } from "@/lib/hub";

// Every CMS change goes through the admin's own session, so the database's security rules apply,
// and each one is written to the activity log (cms_log) with the admin as the actor.

const text = (form: FormData, key: string, max = 500) => String(form.get(key) ?? "").trim().slice(0, max);

function id(value: unknown): string {
  if (!isUuid(value)) throw new Error("Invalid id");
  return value;
}

function fail(error: { message: string } | null | undefined) {
  if (error) throw new Error(error.message);
}

async function done(supabase: Awaited<ReturnType<typeof requireCms>>["supabase"], action: string, entity: string, entityId: string, data: Record<string, unknown> = {}) {
  await supabase.rpc("cms_log", { p_action: action, p_entity: entity, p_entity_id: entityId, p_data: data });
  // the CMS and every hub page show the change
  revalidatePath("/", "layout");
}

// ---------- members ----------
const PLANS = ["owner", "plus", "elite", "advisor"];

export async function cmsUpdateMember(memberId: string, form: FormData) {
  id(memberId);
  const { supabase, profile } = await requireCms();
  const update: Record<string, string> = {};
  for (const [field, max] of [["full_name", 80], ["headline", 160], ["location", 80], ["website", 200], ["bio", 2000]] as const) {
    if (form.has(field)) update[field] = text(form, field, max);
  }
  const plan = text(form, "member_type");
  const status = text(form, "status");
  const role = text(form, "role");
  if (PLANS.includes(plan)) update.member_type = plan;
  if (["active", "suspended"].includes(status)) {
    if (status === "suspended" && memberId === profile.id) throw new Error("You cannot suspend your own account.");
    update.status = status;
  }
  if (["member", "admin"].includes(role) && memberId !== profile.id) update.role = role;
  if (update.website && !/^https?:\/\//i.test(update.website)) update.website = `https://${update.website}`;
  if (Object.keys(update).length === 0) return;
  fail((await supabase.from("profiles").update(update).eq("id", memberId)).error);
  await done(supabase, "member.update", "profiles", memberId, { fields: Object.keys(update) });
}

export async function cmsSetMemberStatus(memberId: string, status: "active" | "suspended") {
  id(memberId);
  const { supabase, profile } = await requireCms();
  if (memberId === profile.id) throw new Error("You cannot suspend your own account.");
  fail((await supabase.from("profiles").update({ status }).eq("id", memberId)).error);
  await done(supabase, status === "suspended" ? "member.suspend" : "member.reactivate", "profiles", memberId);
}

export async function cmsRemoveAvatar(memberId: string) {
  id(memberId);
  const { supabase } = await requireCms();
  fail((await supabase.from("profiles").update({ avatar_url: null }).eq("id", memberId)).error);
  await done(supabase, "member.remove_photo", "profiles", memberId);
}

export async function cmsDeleteMember(memberId: string) {
  id(memberId);
  const { supabase } = await requireCms();
  fail((await supabase.rpc("cms_delete_account", { p_user: memberId })).error);
  revalidatePath("/", "layout");
  redirect("/cms/members?deleted=1");
}

// ---------- posts and comments ----------
const KINDS = ["update", "question", "win", "offer", "hiring"];
const VISIBILITY = ["public", "members", "connections", "private"];

export async function cmsUpdatePost(postId: string, form: FormData) {
  id(postId);
  const { supabase } = await requireCms();
  const update: Record<string, string> = {};
  const body = text(form, "body", 5000);
  if (form.has("body")) {
    if (!body) throw new Error("A post cannot be empty.");
    update.body = body;
  }
  if (KINDS.includes(text(form, "kind"))) update.kind = text(form, "kind");
  if (VISIBILITY.includes(text(form, "visibility"))) update.visibility = text(form, "visibility");
  fail((await supabase.from("posts").update(update).eq("id", postId)).error);
  await done(supabase, "post.edit", "posts", postId, { fields: Object.keys(update) });
}

export async function cmsPinPost(postId: string, pin: boolean) {
  id(postId);
  const { supabase } = await requireCms();
  fail((await supabase.from("posts").update({ pinned_at: pin ? new Date().toISOString() : null }).eq("id", postId)).error);
  await done(supabase, pin ? "post.pin" : "post.unpin", "posts", postId);
}

export async function cmsDeletePost(postId: string, back?: string) {
  id(postId);
  const { supabase } = await requireCms();
  fail((await supabase.from("posts").delete().eq("id", postId)).error);
  await done(supabase, "post.delete", "posts", postId);
  if (back) redirect(back);
}

export async function cmsDeleteComment(commentId: string) {
  id(commentId);
  const { supabase } = await requireCms();
  fail((await supabase.from("comments").delete().eq("id", commentId)).error);
  await done(supabase, "comment.delete", "comments", commentId);
}

// ---------- groups ----------
export async function cmsCreateGroup(form: FormData) {
  const { supabase, userId } = await requireCms();
  const name = text(form, "name", 80);
  if (name.length < 3) throw new Error("Give the group a name of at least 3 characters.");
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, slug, description: text(form, "description", 600), is_private: form.get("is_private") === "on", created_by: userId })
    .select("id")
    .single();
  fail(error);
  await supabase.from("group_members").insert({ group_id: data!.id, user_id: userId, role: "member" });
  await done(supabase, "group.create", "groups", data!.id, { name });
  redirect(`/cms/groups/${data!.id}`);
}

export async function cmsUpdateGroup(groupId: string, form: FormData) {
  id(groupId);
  const { supabase } = await requireCms();
  const name = text(form, "name", 80);
  if (name.length < 3) throw new Error("Give the group a name of at least 3 characters.");
  fail(
    (await supabase.from("groups").update({ name, description: text(form, "description", 600), is_private: form.get("is_private") === "on" }).eq("id", groupId))
      .error,
  );
  await done(supabase, "group.edit", "groups", groupId, { name });
}

export async function cmsDeleteGroup(groupId: string) {
  id(groupId);
  const { supabase } = await requireCms();
  fail((await supabase.from("groups").delete().eq("id", groupId)).error);
  await done(supabase, "group.delete", "groups", groupId);
  redirect("/cms/groups");
}

export async function cmsSetGroupRole(groupId: string, memberId: string, role: "member" | "admin") {
  id(groupId);
  id(memberId);
  const { supabase } = await requireCms();
  fail((await supabase.from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", memberId)).error);
  await done(supabase, role === "admin" ? "group.make_admin" : "group.remove_admin", "group_members", `${groupId}:${memberId}`);
}

export async function cmsRemoveFromGroup(groupId: string, memberId: string) {
  id(groupId);
  id(memberId);
  const { supabase } = await requireCms();
  fail((await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberId)).error);
  await done(supabase, "group.remove_member", "group_members", `${groupId}:${memberId}`);
}

export async function cmsCancelInvite(groupId: string, memberId: string) {
  id(groupId);
  id(memberId);
  const { supabase } = await requireCms();
  fail((await supabase.from("group_invites").delete().eq("group_id", groupId).eq("user_id", memberId)).error);
  await done(supabase, "group.cancel_invite", "group_invites", `${groupId}:${memberId}`);
}

// ---------- businesses ----------
export async function cmsUpdateCompany(companyId: string, form: FormData) {
  id(companyId);
  const { supabase } = await requireCms();
  const name = text(form, "name", 120);
  if (!name) throw new Error("A business needs a name.");
  let website = text(form, "website", 200);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  fail(
    (
      await supabase
        .from("companies")
        .update({ name, category: text(form, "category", 80), website, description: text(form, "description", 3000) })
        .eq("id", companyId)
    ).error,
  );
  await done(supabase, "business.edit", "companies", companyId, { name });
}

export async function cmsDeleteCompany(companyId: string) {
  id(companyId);
  const { supabase } = await requireCms();
  fail((await supabase.from("companies").delete().eq("id", companyId)).error);
  await done(supabase, "business.delete", "companies", companyId);
}

export async function cmsDeleteReview(companyId: string, authorId: string) {
  id(companyId);
  id(authorId);
  const { supabase } = await requireCms();
  fail((await supabase.from("company_reviews").delete().eq("company_id", companyId).eq("author_id", authorId)).error);
  await done(supabase, "review.delete", "company_reviews", `${companyId}:${authorId}`);
}

// ---------- connections ----------
export async function cmsRemoveConnection(requesterId: string, addresseeId: string) {
  id(requesterId);
  id(addresseeId);
  const { supabase } = await requireCms();
  fail((await supabase.from("connections").delete().eq("requester_id", requesterId).eq("addressee_id", addresseeId)).error);
  await done(supabase, "connection.remove", "connections", `${requesterId}:${addresseeId}`);
}

// ---------- reports ----------
export async function cmsSetReport(reportId: string, status: "open" | "resolved") {
  id(reportId);
  const { supabase } = await requireCms();
  fail((await supabase.from("reports").update({ status }).eq("id", reportId)).error);
  await done(supabase, status === "resolved" ? "report.resolve" : "report.reopen", "reports", reportId);
}

/** Resolve a report by acting on it: remove the post, or suspend the member. */
export async function cmsActOnReport(reportId: string, act: "remove_post" | "suspend_member", targetId: string) {
  id(reportId);
  id(targetId);
  const { supabase, profile } = await requireCms();
  if (act === "remove_post") {
    fail((await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId)).error);
    fail((await supabase.from("posts").delete().eq("id", targetId)).error);
    await done(supabase, "report.remove_post", "reports", reportId, { post: targetId });
  } else {
    if (targetId === profile.id) throw new Error("You cannot suspend your own account.");
    fail((await supabase.from("profiles").update({ status: "suspended" }).eq("id", targetId)).error);
    fail((await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId)).error);
    await done(supabase, "report.suspend_member", "reports", reportId, { member: targetId });
  }
}

// ---------- staff ----------
export async function cmsGrantAdmin(form: FormData) {
  const { supabase } = await requireCms();
  const email = text(form, "email", 200).toLowerCase();
  if (!email.includes("@")) throw new Error("Enter the member's email address.");
  const { data } = await supabase.rpc("cms_users", { p_search: email, p_limit: 5 });
  const match = ((data ?? []) as { id: string; email: string }[]).find((u) => u.email.toLowerCase() === email);
  if (!match) throw new Error("No SMB Hub account uses that email. They need to sign up first.");
  fail((await supabase.from("profiles").update({ role: "admin" }).eq("id", match.id)).error);
  await done(supabase, "staff.grant", "profiles", match.id, { email });
}

export async function cmsRevokeAdmin(memberId: string) {
  id(memberId);
  const { supabase, profile } = await requireCms();
  if (memberId === profile.id) throw new Error("You cannot remove your own admin access.");
  fail((await supabase.from("profiles").update({ role: "member" }).eq("id", memberId)).error);
  await done(supabase, "staff.revoke", "profiles", memberId);
}
