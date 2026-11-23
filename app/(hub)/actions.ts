"use server";

import { AUTHOR_FIELDS, requireStaff, requireUser, slugify, type CommentRow, type Profile } from "@/lib/hub";
import { REACTION_KINDS, type ReactionKind } from "@/lib/reactions";
import { cleanPollOptions, FEED } from "@/lib/feed-rules";
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

/**
 * A picture the browser already uploaded. Only an address inside this member's own storage folder is accepted,
 * so nobody can attach another member's file or an outside link.
 */
function ownUpload(form: FormData, field: string, userId: string): string | null {
  const url = text(form, field);
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${userId}/`;
  if (!url.startsWith(prefix) || !/^[a-z]+-[0-9a-f-]{36}\.(jpg|png)$/.test(url.slice(prefix.length))) throw new Error("That picture cannot be used.");
  return url;
}

// ---------- posts ----------
export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const body = text(form, "body");
  if (!body) return { error: "Write something before posting." };
  const rawVisibility = text(form, "visibility");
  const visibility = ["public", "members", "connections", "private"].includes(rawVisibility) ? rawVisibility : "public";
  const groupId = text(form, "group_id") ? uuid(text(form, "group_id")) : null;
  const rawKind = text(form, "kind");
  const kind = ["question", "win", "offer", "hiring", "intro"].includes(rawKind) ? rawKind : "update";
  const image_url = ownUpload(form, "image_url", userId);
  const cover_url = ownUpload(form, "cover_url", userId);
  const title = text(form, "title").slice(0, FEED.titleMax);
  const comments_closed = text(form, "comments_closed") === "1";
  const quoted_post_id = text(form, "quoted_post_id") ? uuid(text(form, "quoted_post_id")) : null;

  // schedule: a local date-time string plus the browser's offset in minutes, turned into one exact moment
  let scheduled_at: string | null = null;
  if (text(form, "scheduled_local")) {
    const offset = Number(text(form, "tz_offset")) || 0;
    const when = new Date(`${text(form, "scheduled_local")}:00Z`);
    if (Number.isNaN(when.getTime())) return { error: "That date does not look right." };
    scheduled_at = new Date(when.getTime() + offset * 60_000).toISOString();
  }

  const options = form.getAll("poll_option").map(String);
  const wantsPoll = options.some((o) => o.trim());
  const pollOptions = wantsPoll ? cleanPollOptions(options) : null;
  if (wantsPoll && !pollOptions) return { error: `A poll needs ${FEED.pollMin} to ${FEED.pollMax} options of up to ${FEED.pollOptionMax} characters.` };
  const pollDays = Math.min(30, Math.max(1, Number(text(form, "poll_days")) || 3));

  // posting as a business page: the database checks the member's role on that page and that it is published
  const business_id = text(form, "business_id") ? uuid(text(form, "business_id")) : null;
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body, visibility: business_id ? "public" : visibility, kind, group_id: business_id ? null : groupId, business_id, image_url, cover_url, title, comments_closed, scheduled_at, quoted_post_id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  if (pollOptions) {
    const closes = new Date(Date.now() + pollDays * 86_400_000).toISOString();
    const res = await supabase.rpc("add_poll", { p_post: data.id, p_options: pollOptions, p_closes: closes });
    if (res.error) {
      await supabase.from("posts").delete().eq("id", data.id); // no half-made post
      return { error: res.error.message };
    }
  }
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

/** Changes the words of your own post inside the edit window (the database enforces the window). */
export async function editPost(postId: string, input: { title: string; body: string }) {
  uuid(postId);
  const { supabase } = await requireUser();
  const body = input.body.trim();
  if (!body) throw new Error("A post cannot be empty.");
  fail((await supabase.from("posts").update({ body, title: input.title.trim().slice(0, FEED.titleMax) }).eq("id", postId)).error);
  revalidatePath("/", "layout");
}

/** Pins one of your posts to your profile, or unpins it. Pinning another one moves the pin. */
export async function setProfilePin(postId: string, pin: boolean) {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  if (pin) fail((await supabase.from("posts").update({ profile_pinned: false }).eq("author_id", userId).eq("profile_pinned", true)).error);
  fail((await supabase.from("posts").update({ profile_pinned: pin }).eq("id", postId)).error);
  revalidatePath("/", "layout");
}

export async function setCommentsClosed(postId: string, closed: boolean) {
  uuid(postId);
  const { supabase } = await requireUser();
  fail((await supabase.from("posts").update({ comments_closed: closed }).eq("id", postId)).error);
  revalidatePath("/", "layout");
}

/** A scheduled post: publish it now, move it to a new time, or delete it. */
export async function publishScheduledNow(postId: string) {
  uuid(postId);
  const { supabase } = await requireUser();
  fail((await supabase.from("posts").update({ scheduled_at: null }).eq("id", postId).eq("status", "scheduled")).error);
  revalidatePath("/", "layout");
}
export async function rescheduleScheduled(postId: string, whenIso: string) {
  uuid(postId);
  const when = new Date(whenIso);
  if (Number.isNaN(when.getTime())) throw new Error("That date does not look right.");
  const { supabase } = await requireUser();
  fail((await supabase.from("posts").update({ scheduled_at: when.toISOString() }).eq("id", postId).eq("status", "scheduled")).error);
  revalidatePath("/", "layout");
}

/** Quote a post you can see, adding your own words. A plain repost stays toggleRepost. */
export async function quotePost(postId: string, body: string) {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim();
  if (!clean) throw new Error("Add your own words to quote a post.");
  fail((await supabase.from("posts").insert({ author_id: userId, body: clean, quoted_post_id: postId, visibility: "public" })).error);
  revalidatePath("/", "layout");
}

/** One vote per member; the database counts it and refuses after the poll closes. */
export async function votePoll(postId: string, optionId: string) {
  uuid(postId);
  uuid(optionId);
  const { supabase, userId } = await requireUser();
  fail((await supabase.from("poll_votes").insert({ post_id: postId, option_id: optionId, user_id: userId })).error);
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

/** Bookmarks: saved is the state before the click. */
export async function toggleSave(postId: string, saved: boolean) {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const { error } = saved
    ? await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", userId)
    : await supabase.from("saved_posts").upsert({ post_id: postId, user_id: userId }, { ignoreDuplicates: true });
  fail(error);
}

const COMMENT_SELECT = `id, body, created_at, edited_at, parent_id, author:profiles!comments_author_id_fkey(${AUTHOR_FIELDS})`;

export async function loadComments(postId: string): Promise<CommentRow[]> {
  uuid(postId);
  const supabase = await createClient();
  const { data } = await supabase.from("comments").select(COMMENT_SELECT).eq("post_id", postId).order("created_at");
  return (data ?? []) as unknown as CommentRow[];
}

export async function addComment(postId: string, body: string, parentId?: string | null): Promise<CommentRow> {
  uuid(postId);
  if (parentId) uuid(parentId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim().slice(0, 2000);
  if (!clean) throw new Error("Empty comment");
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: userId, body: clean, parent_id: parentId ?? null })
    .select(COMMENT_SELECT)
    .single();
  fail(error);
  return data as unknown as CommentRow;
}

export async function editComment(commentId: string, body: string): Promise<CommentRow> {
  uuid(commentId);
  const { supabase } = await requireUser();
  const clean = body.trim().slice(0, 2000);
  if (!clean) throw new Error("Empty comment");
  const { data, error } = await supabase.from("comments").update({ body: clean }).eq("id", commentId).select(COMMENT_SELECT).single();
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

  const avatar = ownUpload(form, "avatar_url", userId);
  if (avatar) update.avatar_url = avatar;

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
  if (profile.role === "admin" && memberId !== profile.id && ["member", "admin"].includes(role)) {
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

/** Save or release a seat at a Hub event. */
export async function setRsvp(eventId: string, on: boolean) {
  uuid(eventId);
  const { supabase, userId } = await requireUser();
  const q = on
    ? supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: userId }, { ignoreDuplicates: true })
    : supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
  fail((await q).error);
  revalidatePath("/events");
}
