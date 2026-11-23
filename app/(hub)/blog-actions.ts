"use server";

import { getViewer, requireStaff, requireUser } from "@/lib/hub";
import { cleanBlocks, canWrite } from "@/lib/zip/member-blogs";
import { getHubSettings } from "@/lib/zip/settings-load";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BlogState = { error?: string; ok?: boolean };
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const isId = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function ownMedia(url: string, userId: string) {
  if (!url) return true;
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${userId}/`;
  return url.startsWith(prefix) && /^[a-z]+-[0-9a-f-]{36}\.(jpg|png)$/.test(url.slice(prefix.length));
}

/** Saves a draft, or submits/publishes/schedules the post. The database decides whether it waits for the team. */
export async function saveBlog(_prev: BlogState, form: FormData): Promise<BlogState> {
  const { userId } = await requireUser();
  const { supabase, isStaff } = await getViewer();
  const rules = await getHubSettings("blogs");
  const plan = ((await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle()).data as { plan?: string } | null)?.plan;
  if (!canWrite(rules, plan, isStaff)) return { error: "Writing posts is not open to your plan." };

  const id = text(form, "id");
  const draft = text(form, "mode") === "draft";
  const title = text(form, "title").slice(0, 160);
  if (title.length < 3) return { error: "Give your post a title." };
  let blocks;
  try { blocks = cleanBlocks(JSON.parse(text(form, "blocks") || "[]")); } catch { return { error: "That post could not be read." }; }
  for (const b of blocks) if (b[0] === "img" && !ownMedia(b[1], userId)) return { error: "One of the pictures cannot be used." };
  const image = text(form, "image_url");
  if (!ownMedia(image, userId)) return { error: "That featured image cannot be used." };
  const cat = text(form, "cat");
  const cats = rules.cats as string[];
  const tags = rules.memberTags ? text(form, "tags").split(",").map((t) => t.trim().replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 8) : [];

  let status: "draft" | "published" | "scheduled" = "draft";
  let scheduled_at: string | null = null;
  if (!draft) {
    if (!blocks.length) return { error: "Write something in the post first." };
    if (!cat || !cats.includes(cat)) return { error: "Choose a category." };
    if (rules.reqImg && !image && !(id && form.get("keep_image") === "1")) return { error: "A featured image is required." };
    status = "published";
    if (text(form, "when") === "schedule") {
      const at = new Date(`${text(form, "date")}T${text(form, "time") || "09:00"}:00Z`);
      if (Number.isNaN(at.getTime())) return { error: "That date does not look right." };
      scheduled_at = new Date(at.getTime() + (Number(text(form, "tz_offset")) || 0) * 60_000).toISOString();
      if (scheduled_at <= new Date().toISOString()) return { error: "Pick a time in the future." };
      status = "scheduled";
    }
  }
  const row = { title, cat, tags, blocks, status, scheduled_at, ...(image ? { image_url: image } : {}) };
  let postId = id;
  if (id) {
    if (!isId(id)) return { error: "Unknown post." };
    const { error } = await supabase.from("member_blogs").update(row).eq("id", id).eq("author_id", userId);
    if (error) return { error: friendly(error.message) };
  } else {
    const { data, error } = await supabase.from("member_blogs").insert({ author_id: userId, ...row, image_url: image || null }).select("id").single();
    if (error) return { error: friendly(error.message) };
    postId = (data as { id: string }).id;
  }
  const { data: saved } = await supabase.from("member_blogs").select("status").eq("id", postId).maybeSingle();
  if ((saved as { status?: string } | null)?.status === "published" && !id) {
    await supabase.from("posts").insert({ author_id: userId, body: `I published a new blog post: “${title}”\n\n/member-blogs/${postId}`, visibility: "public", kind: "update" });
  }
  revalidatePath("/", "layout");
  redirect(`/member-blogs/${postId}`);
}

function friendly(message: string) {
  if (/blogs\.who/.test(message)) return "Writing posts is not open to your plan.";
  if (/row-level/.test(message)) return "You cannot change that post.";
  return message.length < 160 ? message : "Something went wrong. Please try again.";
}

export async function deleteBlog(id: string) {
  if (!isId(id)) throw new Error("Unknown post.");
  const { supabase } = await requireUser();
  await supabase.from("member_blogs").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/member-blogs");
}

/** The team approves a waiting post, or sends it back to its author. */
export async function decideBlog(id: string, approve: boolean) {
  if (!isId(id)) throw new Error("Unknown post.");
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("member_blogs").select("scheduled_at").eq("id", id).maybeSingle();
  const at = (data as { scheduled_at: string | null } | null)?.scheduled_at;
  const status = !approve ? "sent_back" : at && at > new Date().toISOString() ? "scheduled" : "published";
  await supabase.from("member_blogs").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

