"use server";

import { getMe, slugify } from "@/lib/hub";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ---------- posts ----------
export async function createPost(form: FormData) {
  const { supabase, userId } = await getMe();
  const body = text(form, "body");
  if (!body) return;
  const visibility = text(form, "visibility") || "public";
  const groupId = text(form, "group_id") || null;
  let image_url: string | null = null;

  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/") || image.size > 5 * 1024 * 1024) {
      throw new Error("Images only, up to 5 MB.");
    }
    const ext = image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, image, { contentType: image.type });
    fail(error);
    image_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body, visibility, group_id: groupId, image_url });
  fail(error);
  revalidatePath("/", "layout");
}

export async function deletePost(postId: string) {
  const { supabase } = await getMe();
  fail((await supabase.from("posts").delete().eq("id", postId)).error);
  revalidatePath("/", "layout");
}

export async function toggleLike(postId: string, liked: boolean) {
  const { supabase, userId } = await getMe();
  const { error } = liked
    ? await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabase.from("reactions").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
  fail(error);
  revalidatePath("/", "layout");
}

export async function addComment(postId: string, form: FormData) {
  const { supabase, userId } = await getMe();
  const body = text(form, "body");
  if (!body) return;
  fail((await supabase.from("comments").insert({ post_id: postId, author_id: userId, body })).error);
  revalidatePath(`/posts/${postId}`);
}

export async function deleteComment(commentId: string, postId: string) {
  const { supabase } = await getMe();
  fail((await supabase.from("comments").delete().eq("id", commentId)).error);
  revalidatePath(`/posts/${postId}`);
}

export async function reportPost(postId: string, form: FormData) {
  const { supabase, userId } = await getMe();
  const reason = text(form, "reason") || "other";
  fail((await supabase.from("reports").insert({ reporter_id: userId, post_id: postId, reason })).error);
  redirect(`/posts/${postId}?reported=1`);
}

// ---------- connections ----------
export async function requestConnection(otherId: string) {
  const { supabase, userId } = await getMe();
  fail((await supabase.from("connections").insert({ requester_id: userId, addressee_id: otherId })).error);
  revalidatePath("/", "layout");
}

export async function acceptConnection(requesterId: string) {
  const { supabase, userId } = await getMe();
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
  const { supabase, userId } = await getMe();
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
  const { supabase, userId } = await getMe();
  fail(
    (await supabase.from("blocks").upsert({ blocker_id: userId, blocked_id: otherId }, { ignoreDuplicates: true }))
      .error,
  );
  await removeConnection(otherId);
  redirect("/members");
}

// ---------- groups ----------
export async function createGroup(form: FormData) {
  const { supabase, userId } = await getMe();
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
  const { supabase, userId } = await getMe();
  fail(
    (await supabase.from("group_members").upsert({ group_id: groupId, user_id: userId }, { ignoreDuplicates: true }))
      .error,
  );
  revalidatePath("/groups", "layout");
}

export async function leaveGroup(groupId: string) {
  const { supabase, userId } = await getMe();
  fail((await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)).error);
  revalidatePath("/groups", "layout");
}

// ---------- profile ----------
export async function updateProfile(form: FormData) {
  const { supabase, userId } = await getMe();
  const update: Record<string, string> = {
    full_name: text(form, "full_name"),
    headline: text(form, "headline"),
    bio: text(form, "bio"),
    location: text(form, "location"),
    website: text(form, "website"),
  };
  if (!update.full_name) throw new Error("Name is required.");

  const avatar = form.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/") || avatar.size > 2 * 1024 * 1024) {
      throw new Error("Profile photo must be an image up to 2 MB.");
    }
    const path = `${userId}/avatar-${crypto.randomUUID()}`;
    const { error } = await supabase.storage.from("media").upload(path, avatar, { contentType: avatar.type });
    fail(error);
    update.avatar_url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  fail((await supabase.from("profiles").update(update).eq("id", userId)).error);
  redirect(`/members/${userId}`);
}

// ---------- notifications & moderation ----------
export async function markNotificationsRead() {
  const { supabase, userId } = await getMe();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  fail(error);
  revalidatePath("/", "layout");
}

export async function resolveReport(reportId: string, removePostId: string | null) {
  const { supabase, profile } = await getMe();
  if (profile?.role === "member") throw new Error("Not allowed.");
  if (removePostId) fail((await supabase.from("posts").delete().eq("id", removePostId)).error);
  // if the post was removed the report row is deleted with it, so this update is a no-op then
  fail((await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId)).error);
  revalidatePath("/admin/reports");
}

export async function setMemberStatus(memberId: string, status: "active" | "suspended") {
  const { supabase, profile } = await getMe();
  if (profile?.role === "member") throw new Error("Not allowed.");
  fail((await supabase.from("profiles").update({ status }).eq("id", memberId)).error);
  revalidatePath("/", "layout");
}
