"use server";

import { AUTHOR_FIELDS, requireStaff, requireUser, slugify, type CommentRow, type Profile } from "@/lib/hub";
import { REACTION_KINDS, type ReactionKind } from "@/lib/reactions";
import { cleanPollOptions, FEED } from "@/lib/feed-rules";
import { createClient } from "@/lib/supabase/server";
import { canStartPost, getHubSettings } from "@/lib/zip/settings-load";
import { extractTags, canon } from "@/lib/zip/hashtags";
import { getTagIndex, getTagRules } from "@/lib/zip/hashtags-server";
import { checkPdf } from "@/lib/post-pdf";
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

/** held: Update 41's automatic checks stopped it for the Hub team to review (members never see it until approved) */
export type FormState = { error?: string; ok?: number; held?: boolean };

/** No row came back from an insert: the database's safety checks held it for review (Update 41). */
async function wasHeld(supabase: Awaited<ReturnType<typeof createClient>>, error: { code?: string } | null, data: unknown) {
  if (data || (error && error.code !== "PGRST116")) return false;
  const { data: held } = await supabase.rpc("safety_just_held");
  return held === true;
}

/**
 * A picture the browser already uploaded. Only an address inside this member's own storage folder is accepted,
 * so nobody can attach another member's file or an outside link.
 */
function ownUpload(form: FormData, field: string, userId: string): string | null {
  return ownPicture(text(form, field), userId);
}
function ownPicture(url: string, userId: string): string | null {
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${userId}/`;
  if (!url.startsWith(prefix) || !/^[a-z]+-[0-9a-f-]{36}\.(jpg|png)$/.test(url.slice(prefix.length))) throw new Error("That picture cannot be used.");
  return url;
}

/** Update 10: a post's video, uploaded by this member to the post-videos bucket. */
function ownVideo(url: string, userId: string): string | null {
  if (!url) return null;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-videos/${userId}/`;
  if (!url.startsWith(prefix) || !/^video-[0-9a-f-]{36}\.(mp4|mov)$/.test(url.slice(prefix.length))) throw new Error("That video cannot be used.");
  return url;
}

// ---------- posts ----------
/** Minutes a member may still edit: "0" is off, "forever" has no limit. */
function editMinutes(v: unknown) {
  if (v === "forever") return Infinity;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : FEED.editMinutes;
}

/** Hashtag rules for a new post: the most tags allowed, and who may start a tag nobody has used yet. */
async function checkNewTags(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string, body: string): Promise<string | null> {
  const r = await getTagRules();
  if (!r.on) return null;
  const all = [...new Set([...body.matchAll(/#([A-Za-zÀ-ſ][A-Za-z0-9_À-ſ]*)/g)].map((m) => canon(m[1], r.merge)))];
  const mine = extractTags(body, { ...r, per: 999 });
  if (mine.length > r.per) return `Use up to ${r.per} hashtags in one post.`;
  if (r.create === "all" || !mine.length) return null;
  const { data: me } = await supabase.from("profiles").select("role, plan").eq("id", userId).maybeSingle();
  const p = me as { role?: string; plan?: string } | null;
  if (p?.role === "admin" || p?.role === "moderator") return null;
  if (r.create === "paid" && (p?.plan === "plus" || p?.plan === "advisor")) return null;
  const known = new Set((await getTagIndex(supabase)).map((t) => t.tag));
  const fresh = all.find((t) => mine.includes(t) && !known.has(t));
  return fresh ? `#${fresh} is new. ${r.create === "team" ? "Only the Hub team" : "Only Plus members and Advisors"} can start a hashtag. Pick one that exists.` : null;
}

export async function createPost(_prev: FormState, form: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const rules = await getHubSettings("feed");
  if (!(await canStartPost(supabase, userId))) return { error: "Posting is limited to certain members right now. You can still react, reply and vote." };
  const body = text(form, "body");
  // Update 26: a post can be just photos, a video or a PDF, with no text
  const hasMedia = form.getAll("images").some((x) => String(x).trim()) || !!text(form, "video_url") || !!text(form, "pdf_path");
  if (!body && !hasMedia) return { error: "Write something before posting." };
  const tagErr = body ? await checkNewTags(supabase, userId, body) : null;
  if (tagErr) return { error: tagErr };
  let pdf = {};
  if (text(form, "pdf_path")) {
    const r = await checkPdf(supabase, userId, text(form, "pdf_path"), text(form, "pdf_name"));
    if ("error" in r) return { error: r.error };
    pdf = r;
  }
  const rawVisibility = text(form, "visibility");
  const visibility = ["public", "members", "connections", "private"].includes(rawVisibility) ? rawVisibility : "public";
  const groupId = text(form, "group_id") ? uuid(text(form, "group_id")) : null;
  const rawKind = text(form, "kind");
  const kind = ["question", "win", "offer", "hiring", "intro"].includes(rawKind) ? rawKind : "update";
  // Update 10: up to 10 photos (the first is also image_url, which every older view shows) and 1 video
  const many = form.getAll("images").map(String).filter(Boolean);
  if (many.length > 10) return { error: "A post can have up to 10 photos." };
  const images = many.map((u) => ownPicture(u, userId)!);
  const image_url = images[0] ?? ownUpload(form, "image_url", userId);
  const cover_url = ownUpload(form, "cover_url", userId);
  const video_url = ownVideo(text(form, "video_url"), userId);
  const video_poster = video_url ? ownUpload(form, "video_poster", userId) : null;
  const titleRule = String(rules.title);
  const title = titleRule === "off" ? "" : text(form, "title").slice(0, FEED.titleMax);
  if (titleRule === "required" && !title) return { error: "Add a title to your post." };
  const comments_closed = rules.closeC ? text(form, "comments_closed") === "1" : false;
  if (!rules.cover && text(form, "cover_url")) return { error: "Cover pictures are turned off." };
  if (!rules.schedule && text(form, "scheduled_local")) return { error: "Scheduling posts is turned off." };
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
  if (wantsPoll && !rules.polls) return { error: "Polls are turned off." };
  const pollCap = Math.min(FEED.pollMax, Math.max(FEED.pollMin, Number(rules.pollMax) || FEED.pollMax));
  if (wantsPoll && options.filter((o) => o.trim()).length > pollCap) return { error: `A poll can have up to ${pollCap} options.` };
  const pollOptions = wantsPoll ? cleanPollOptions(options) : null;
  if (wantsPoll && !pollOptions) return { error: `A poll needs ${FEED.pollMin} to ${FEED.pollMax} options of up to ${FEED.pollOptionMax} characters.` };
  const pollDays = Math.min(30, Math.max(1, Number(text(form, "poll_days")) || 3));

  // posting as a business page: the database checks the member's role on that page and that it is published
  const business_id = text(form, "business_id") ? uuid(text(form, "business_id")) : null;
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body, visibility: business_id ? "public" : visibility, kind, group_id: business_id ? null : groupId, business_id, image_url, cover_url, title, comments_closed, scheduled_at, quoted_post_id, ...(images.length ? { images } : {}), ...(video_url ? { video_url, video_poster } : {}), ...pdf })
    .select("id")
    .maybeSingle();
  if (await wasHeld(supabase, error, data)) return { ok: Date.now(), held: true };
  if (error || !data) return { error: error?.message ?? "Your post was not saved." };
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
export type PostEdit = {
  kind: string;
  title: string;
  body: string;
  /** every photo the post should have after saving, in order (kept ones and newly uploaded ones) */
  images: string[];
  /** the PDF: unchanged, removed (null) or a newly uploaded one */
  pdf: "keep" | null | { path: string; name: string };
};

/**
 * Update 26: the edit window. The author can change the type, title, text, photos (up to 10) and the PDF;
 * the video stays. The database keeps the previous version for moderation and shows "Edited".
 */
export async function editPost(postId: string, input: PostEdit): Promise<{ error?: string }> {
  uuid(postId);
  const { supabase, userId } = await requireUser();
  const rules = await getHubSettings("feed");
  const { data } = await supabase.from("posts").select("created_at, author_id, kind, image_url, images, video_url").eq("id", postId).maybeSingle();
  const row = data as { created_at: string; author_id: string; kind: string; image_url: string | null; images: string[] | null; video_url: string | null } | null;
  if (!row || row.author_id !== userId) return { error: "Only the author can edit this post." };
  const mins = editMinutes(rules.edit);
  if (Date.now() - new Date(row.created_at).getTime() > mins * 60_000) return { error: "The edit window for this post has closed." };

  const body = String(input.body ?? "").trim();
  if (body.length > 5000) return { error: "A post can be up to 5,000 characters." };
  const kinds = ["update", "question", "win", "hiring", "intro", "offer"];
  const kind = kinds.includes(input.kind) ? input.kind : row.kind;
  if (kind === "offer" && row.kind !== "offer") {
    const { data: me } = await supabase.from("profiles").select("plan, role").eq("id", userId).maybeSingle();
    const m = me as { plan?: string; role?: string } | null;
    if (!(m?.role && m.role !== "member") && !["plus", "advisor"].includes(String(m?.plan))) return { error: "Offers are for Plus members and Advisors." };
  }
  const titleRule = String(rules.title);
  const title = titleRule === "off" ? undefined : String(input.title ?? "").trim().slice(0, FEED.titleMax);
  if (titleRule === "required" && !title) return { error: "Add a title to your post." };

  // photos: ones the post already had may stay; new ones must be this member's own uploads
  const had = new Set([...(row.images ?? []), ...(row.image_url ? [row.image_url] : [])]);
  const list = (Array.isArray(input.images) ? input.images : []).map(String).filter(Boolean);
  if (list.length > 10) return { error: "A post can have up to 10 photos." };
  let images: string[];
  try {
    images = list.map((u) => (had.has(u) ? u : ownPicture(u, userId)!));
  } catch {
    return { error: "That picture cannot be used." };
  }

  let pdf: Record<string, unknown> = {};
  let hasPdf: boolean | null = null;
  if (input.pdf === null) {
    pdf = { pdf_path: null, pdf_name: null, pdf_size: null, pdf_pages: null };
    hasPdf = false;
  } else if (input.pdf && input.pdf !== "keep") {
    const r = await checkPdf(supabase, userId, String(input.pdf.path), String(input.pdf.name));
    if ("error" in r) return { error: r.error };
    pdf = r;
    hasPdf = true;
  }
  if (hasPdf === null) {
    const { data: cur } = await supabase.from("posts").select("pdf_path").eq("id", postId).maybeSingle();
    hasPdf = !!(cur as { pdf_path?: string | null } | null)?.pdf_path;
  }
  if (!body && !images.length && !row.video_url && !hasPdf) return { error: "A post cannot be empty." };

  // photos are only written when they changed, so an untouched post never trips the media rules
  const before = row.images?.length ? row.images : row.image_url ? [row.image_url] : [];
  const same = before.length === images.length && before.every((u, i) => u === images[i]);
  const { error } = await supabase
    .from("posts")
    .update({ kind, body, ...(title !== undefined ? { title } : {}), ...(same ? {} : { images, image_url: images[0] ?? null }), ...pdf })
    .eq("id", postId);
  if (error) return { error: /edit window/i.test(error.message) ? "The edit window for this post has closed." : "Could not save your changes. Try again." };
  revalidatePath("/", "layout");
  return {};
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
  const { error } = await supabase.from("posts").insert({ author_id: userId, body: clean, quoted_post_id: postId, visibility: "public" });
  if (error) return { error: error.message.includes("safety: ") ? error.message : "Your post was not saved. Try again." };
  revalidatePath("/", "layout");
  return {};
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

export async function addComment(postId: string, body: string, parentId?: string | null): Promise<CommentRow | { error: string } | { held: true }> {
  uuid(postId);
  if (parentId) uuid(parentId);
  const { supabase, userId } = await requireUser();
  const clean = body.trim().slice(0, 2000);
  if (!clean) throw new Error("Empty comment");
  const rules = await getHubSettings("feed");
  if (!rules.comments) throw new Error("Comments are turned off.");
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: userId, body: clean, parent_id: parentId ?? null })
    .select(COMMENT_SELECT)
    .maybeSingle();
  if (await wasHeld(supabase, error, data)) return { held: true };
  if (error?.message.includes("safety: ")) return { error: error.message };
  fail(error);
  return data as unknown as CommentRow;
}

export async function editComment(commentId: string, body: string): Promise<CommentRow> {
  uuid(commentId);
  const { supabase } = await requireUser();
  const clean = body.trim().slice(0, 2000);
  if (!clean) throw new Error("Empty comment");
  const rules = await getHubSettings("feed");
  const { data: row } = await supabase.from("comments").select("created_at").eq("id", commentId).maybeSingle();
  const mins = editMinutes(rules.cedit);
  if (row && Date.now() - new Date((row as { created_at: string }).created_at).getTime() > mins * 60_000) throw new Error("The edit window for this comment has closed.");
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
  const ps = await getHubSettings("profiles");
  if (!ps.connect) throw new Error("Connecting is turned off.");
  // each profile type can be limited to asking certain other types
  const { data: pair } = await supabase.from("profiles").select("id, profile_type").in("id", [userId, otherId]);
  const typeOf = (id: string) => (pair as { id: string; profile_type?: string }[] | null)?.find((p) => p.id === id)?.profile_type ?? "owner";
  const allowed = (ps.access as Record<string, string[] | null>)[typeOf(userId)];
  if (allowed && !allowed.includes(typeOf(otherId))) throw new Error("Your profile type cannot ask to connect with that type of member.");
  const ins = await supabase.from("connections").insert({ requester_id: userId, addressee_id: otherId });
  // Update 33: the other member's choices in Settings and privacy
  if (ins.error?.message.includes("shared_groups_only")) throw new Error("This member only takes connection requests from people in the same groups.");
  if (ins.error?.message.includes("member_paused")) throw new Error("This member is taking a break.");
  if (ins.error?.message.includes("safety: ")) return { error: ins.error.message };
  fail(ins.error);
  if (ps.autoFollow) await supabase.from("follows").upsert({ follower_id: userId, followee_id: otherId }, { ignoreDuplicates: true });
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
  if ((await getHubSettings("profiles")).autoFollow) await supabase.from("follows").upsert({ follower_id: userId, followee_id: requesterId }, { ignoreDuplicates: true });
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
  if (pin && !(await getHubSettings("feed")).pin) throw new Error("Pinning posts is turned off.");
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
    .maybeSingle();
  if (await wasHeld(supabase, error, data)) return { held: true as const };
  if (error?.message.includes("safety: ")) return { error: error.message };
  if (error) throw new Error(error.message.includes("only_connections") ? "This member only takes messages from their connections." : "You can only message members you are connected with.");
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

/** Save a piece for later, or mark it helpful or insightful. Marking again takes the mark off. */
export async function toggleArticleMark(item: string, kind: "saved" | "helpful" | "insightful", on: boolean) {
  if (!/^(blog|news|podcast)\/[a-z0-9-]{1,200}$/.test(item) || !["saved", "helpful", "insightful"].includes(kind)) throw new Error("Not found");
  const { supabase, userId } = await requireUser();
  const q = on
    ? supabase.from("article_marks").upsert({ user_id: userId, item, kind }, { ignoreDuplicates: true })
    : supabase.from("article_marks").delete().eq("user_id", userId).eq("item", item).eq("kind", kind);
  fail((await q).error);
}

// ---------- contact page ----------
export async function sendContactMessage(_prev: FormState, form: FormData): Promise<FormState> {
  if (text(form, "website")) return { ok: Date.now() }; // hidden field only bots fill in
  const name = text(form, "name").slice(0, 120);
  const email = text(form, "email").slice(0, 200);
  const message = text(form, "message").slice(0, 4000);
  if (!message) return { error: "Write a message first." };
  if (!name) return { error: "Add your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Add an email address we can reply to." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.from("contact_messages").insert({ name, email, message, user_id: data.user?.id ?? null });
  if (error) return { error: "Your message could not be sent. Please email support@smehub.ca." };
  return { ok: Date.now() };
}
