"use server";

import { AUTHOR_FIELDS, requireStaff, requireUser, slugify, type CommentRow, type Profile } from "@/lib/hub";
import { REACTION_KINDS, type ReactionKind } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Ids arrive from the browser, so they are checked before being used in a query or a filter string. */
function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid id");
  return value;
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export type FormState = { error?: string; ok?: number };

// ---------- posts ----------
export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const body = text(form, "body");
  if (!body) return { error: "Write something before posting." };
  const rawVisibility = text(form, "visibility");
  const visibility = ["public", "members", "connections", "private"].includes(rawVisibility) ? rawVisibility : "public";
  const groupId = text(form, "group_id") ? uuid(text(form, "group_id")) : null;
  const rawKind = text(form, "kind");
  const kind = ["question", "win", "offer", "hiring"].includes(rawKind) ? rawKind : "update";
  let image_url: string | null = null;

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) return { error: "That file is not an image." };
    if (image.size > 5 * 1024 * 1024) return { error: "Images can be up to 5 MB." };
    const ext = image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, image, { contentType: image.type });
    if (error) return { error: `Image upload failed: ${error.message}` };
    image_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body, visibility, kind, group_id: groupId, image_url });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function deletePost(postId: string) {
  uuid(postId);
  const { supabase } = await requireUser();
  fail((await supabase.from("posts").delete().eq("id", postId)).error);
  revalidatePath("/", "layout");
}

/** Called from the like button, which already shows the new state. */
/** Sets the viewer's reaction on a post, or clears it when kind is null. */
export async function setReaction(postId: string, kind: ReactionKind | null) {
  uuid(postId);
  if (kind !== null && !REACTION_KINDS.includes(kind)) throw new Error("Unknown reaction");
  const { supabase, userId } = await requireUser();
  const { error } = kind
    ? await supabase.from("reactions").upsert({ post_id: postId, user_id: userId, kind }, { onConflict: "post_id,user_id" })
    : await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId);
  fail(error);
}

export async function toggleRepost(postId: string, reposted: boolean) {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const { error } = reposted
    ? await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabase.from("reposts").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
  fail(error);
}

export async function loadComments(postId: string): Promise<CommentRow[]> {
  uuid(postId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(`id, body, created_at, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS})`)
    .eq("post_id", postId)
    .order("created_at");
  return (data ?? []) as unknown as CommentRow[];
}

export async function addComment(postId: string, body: string): Promise<CommentRow> {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim().slice(0, 2000);
  if (!clean) throw new Error("Empty comment");
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: userId, body: clean })
    .select(`id, body, created_at, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS})`)
    .single();
  fail(error);
  return data as unknown as CommentRow;
}

export async function deleteComment(commentId: string) {
  uuid(commentId);
  const { supabase } = await requireUser();
  fail((await supabase.from("comments").delete().eq("id", commentId)).error);
}

export async function reportPost(postId: string, reason: string) {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const allowed = ["spam", "harassment", "inappropriate", "misinformation", "other"];
  fail((await supabase.from("reports").insert({ reporter_id: userId, post_id: postId, reason: allowed.includes(reason) ? reason : "other" })).error);
}

// ---------- connections ----------
export async function requestConnection(otherId: string) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  fail((await supabase.from("connections").insert({ requester_id: userId, addressee_id: otherId })).error);
  revalidatePath("/", "layout");
}

export async function acceptConnection(requesterId: string) {
  uuid(requesterId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("connections")
    .update({ status: "accepted" })
    .eq("requester_id", requesterId)
    .eq("addressee_id", userId);
  fail(error);
  revalidatePath("/", "layout");
}

/** Declines a request, cancels one you sent, or removes an existing connection. */
export async function removeConnection(otherId: string) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("connections")
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
    );
  fail(error);
  revalidatePath("/", "layout");
}

export async function blockMember(otherId: string) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  fail(
    (await supabase.from("blocks").upsert({ blocker_id: userId, blocked_id: otherId }, { ignoreDuplicates: true }))
      .error,
  );
  await removeConnection(otherId);
  redirect("/members");
}

// ---------- groups ----------
export async function createGroup(form: FormData) {
  const { supabase, userId } = await requireUser();
  const name = text(form, "name");
  if (!name) return;
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`;
  const { error } = await supabase.from("groups").insert({
    name,
    slug,
    description: text(form, "description"),
    is_private: form.get("is_private") === "on",
    created_by: userId,
  });
  fail(error);
  redirect(`/groups/${slug}`);
}

export async function joinGroup(groupId: string) {
  uuid(groupId);
  const { supabase, userId } = await requireUser();
  fail(
    (await supabase.from("group_members").upsert({ group_id: groupId, user_id: userId }, { ignoreDuplicates: true }))
      .error,
  );
  revalidatePath("/", "layout");
}

export async function leaveGroup(groupId: string) {
  uuid(groupId);
  const { supabase, userId } = await requireUser();
  fail((await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)).error);
  revalidatePath("/", "layout");
}

// ---------- profile ----------
export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const update: Record<string, string> = {
    full_name: text(form, "full_name"),
    headline: text(form, "headline"),
    bio: text(form, "bio"),
    location: text(form, "location"),
    website: text(form, "website"),
  };
  if (!update.full_name) return { error: "Add your name so people can find you." };

  const avatar = form.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) return { error: "The profile photo must be an image." };
    if (avatar.size > 2 * 1024 * 1024) return { error: "Profile photos can be up to 2 MB." };
    const path = `${userId}/avatar-${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("media").upload(path, avatar, { contentType: avatar.type });
    if (error) return { error: `Photo upload failed: ${error.message}` };
    update.avatar_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  redirect(`/members/${userId}`);
}

export async function markNotificationsRead() {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  fail(error);
  revalidatePath("/", "layout");
}

// ---------- admin ----------
export async function adminResolveReport(reportId: string, removePostId: string | null) {
  uuid(reportId);
  if (removePostId) uuid(removePostId);
  const { supabase } = await requireStaff();
  if (removePostId) fail((await supabase.from("posts").delete().eq("id", removePostId)).error);
  // when the post is removed its reports go with it, so this update then touches nothing
  fail((await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId)).error);
  revalidatePath("/", "layout");
}

export async function adminUpdateMember(memberId: string, form: FormData) {
  uuid(memberId);
  const { supabase, profile } = await requireStaff();
  const update: Partial<Pick<Profile, "member_type" | "status" | "role">> = {};
  const memberType = text(form, "member_type");
  const status = text(form, "status");
  const role = text(form, "role");
  if (["owner", "plus", "elite", "advisor"].includes(memberType)) update.member_type = memberType as Profile["member_type"];
  if (["active", "suspended"].includes(status)) update.status = status as Profile["status"];
  // only admins change roles, and nobody changes their own
  if (profile.role === "admin" && memberId !== profile.id && ["member", "moderator", "admin"].includes(role)) {
    update.role = role as Profile["role"];
  }
  if (Object.keys(update).length === 0) return;
  fail((await supabase.from("profiles").update(update).eq("id", memberId)).error);
  revalidatePath("/", "layout");
}

export async function adminDeletePost(postId: string) {
  uuid(postId);
  const { supabase } = await requireStaff();
  fail((await supabase.from("posts").delete().eq("id", postId)).error);
  revalidatePath("/", "layout");
}

export async function adminPinPost(postId: string, pin: boolean) {
  uuid(postId);
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("posts")
    .update({ pinned_at: pin ? new Date().toISOString() : null })
    .eq("id", postId);
  fail(error);
  revalidatePath("/", "layout");
}

export async function adminDeleteGroup(groupId: string) {
  uuid(groupId);
  const { supabase } = await requireStaff();
  fail((await supabase.from("groups").delete().eq("id", groupId)).error);
  revalidatePath("/", "layout");
}

// ---------- messages ----------
export async function sendMessage(recipientId: string, body: string) {
  uuid(recipientId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim().slice(0, 4000);
  if (!clean) throw new Error("Empty message");
  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: userId, recipient_id: recipientId, body: clean })
    .select("id, created_at")
    .single();
  if (error) throw new Error("You can only message members you are connected with.");
  return data as { id: string; created_at: string };
}

export async function markThreadRead(otherId: string) {
  uuid(otherId);
  const { supabase, userId } = await requireUser();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .eq("sender_id", otherId)
    .is("read_at", null);
}

export async function markNotificationRead(id: string) {
  uuid(id);
  const { supabase, userId } = await requireUser();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
}

// ---------- businesses ----------
const LISTING_LIMIT: Record<Profile["member_type"], number> = { owner: 0, plus: 1, elite: 2, advisor: 3 };

export async function saveBusiness(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId, profile, isStaff } = await requireUser();
  if (!profile) return { error: "Finish your profile first." };
  const id = text(form, "id") ? uuid(text(form, "id")) : "";
  const name = text(form, "name");
  if (!name) return { error: "Add the business name." };
  const fields: Record<string, string> = {
    name,
    category: text(form, "category"),
    description: text(form, "description"),
    website: text(form, "website"),
  };

  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!logo.type.startsWith("image/")) return { error: "The logo must be an image." };
    if (logo.size > 2 * 1024 * 1024) return { error: "Logos can be up to 2 MB." };
    const path = `${userId}/logo-${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("media").upload(path, logo, { contentType: logo.type });
    if (error) return { error: `Logo upload failed: ${error.message}` };
    fields.logo_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  if (id) {
    const { error } = await supabase.from("companies").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { count } = await supabase.from("companies").select("id", { count: "exact", head: true }).eq("owner_id", userId);
    const limit = isStaff ? 99 : LISTING_LIMIT[profile.member_type];
    if ((count ?? 0) >= limit) {
      return {
        error: limit === 0 ? "Business listings are part of the paid plans. See Upgrade to add yours." : `Your plan includes ${limit} business ${limit === 1 ? "listing" : "listings"}. Upgrade to add more.`,
      };
    }
    const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 4)}`;
    const { error } = await supabase.from("companies").insert({ ...fields, slug, owner_id: userId });
    if (error) return { error: error.message };
  }
  revalidatePath("/", "layout");
  redirect("/businesses/mine");
}

export async function deleteBusiness(companyId: string) {
  uuid(companyId);
  const { supabase } = await requireUser();
  fail((await supabase.from("companies").delete().eq("id", companyId)).error);
  revalidatePath("/", "layout");
}

// ---------- business reviews ----------
export async function saveReview(companyId: string, rating: number, body: string) {
  uuid(companyId);
  const { supabase, userId } = await requireUser();
  const stars = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)));
  const { error } = await supabase
    .from("company_reviews")
    .upsert({ company_id: companyId, author_id: userId, rating: stars, body: body.trim().slice(0, 1000) });
  if (error) throw new Error("Could not save your review.");
  revalidatePath("/businesses", "layout");
}

export async function deleteReview(companyId: string, authorId: string) {
  uuid(companyId);
  uuid(authorId);
  const { supabase } = await requireUser();
  fail((await supabase.from("company_reviews").delete().eq("company_id", companyId).eq("author_id", authorId)).error);
  revalidatePath("/businesses", "layout");
}

// ---------- private-group invitations ----------
export async function inviteToGroup(groupId: string, memberId: string) {
  uuid(groupId);
  uuid(memberId);
  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("group_invites").upsert({ group_id: groupId, user_id: memberId, invited_by: userId }, { ignoreDuplicates: true });
  if (error) throw new Error("Only group admins can invite, and only their own connections.");
}

/** Withdraws an invitation you sent, or declines one you received. */
export async function removeGroupInvite(groupId: string, memberId: string) {
  uuid(groupId);
  uuid(memberId);
  const { supabase } = await requireUser();
  fail((await supabase.from("group_invites").delete().eq("group_id", groupId).eq("user_id", memberId)).error);
  revalidatePath("/groups", "layout");
}
