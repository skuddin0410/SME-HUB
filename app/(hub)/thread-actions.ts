"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";

/** Update 42: replies, Helpful votes and host requests. The database checks every rule again. */

type Done = { ok?: boolean; error?: string; held?: boolean };
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function replyToThread(threadId: string, body: string, parentId: string | null = null): Promise<Done> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to reply." };
  if (!isId(threadId) || (parentId !== null && !isId(parentId))) return { error: "This thread has ended." };
  const text = String(body ?? "").trim().slice(0, 2000);
  if (!text) return { error: "Write your reply first." };
  const { data, error } = await v.supabase.rpc("thread_reply", { p_thread: threadId, p_body: text, p_parent: parentId });
  if (error) return { error: error.message };
  revalidatePath("/thread/[id]", "page");
  return (data as { held?: boolean } | null)?.held ? { held: true } : { ok: true };
}

export async function voteReply(replyId: string, on: boolean): Promise<Done & { n?: number }> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to vote." };
  if (!isId(replyId)) return { error: "That reply isn’t here any more." };
  const { data, error } = await v.supabase.rpc("thread_vote", { p_reply: replyId, p_on: !!on });
  if (error) return { error: "That didn’t save. Try again." };
  return { ok: true, n: data as number };
}

/** "I'd like to host": goes to the team's Moderation area. */
export async function requestHost(): Promise<Done & { already?: boolean }> {
  const v = await getViewer();
  if (!v.userId) return { error: "Sign in to offer to host." };
  const { data, error } = await v.supabase.rpc("request_host");
  if (error) return { error: "That didn’t send. Try again." };
  revalidatePath("/moderation");
  return { ok: true, already: data === "already" };
}

/** The team: make the member the host of a public group, or decline. */
export async function decideHost(requestId: string, groupId: string | null, approve: boolean): Promise<Done> {
  const v = await getViewer();
  if (!v.userId || !v.isStaff || !isId(requestId) || (approve && !isId(groupId))) return { error: approve ? "Choose a public group." : "Not allowed." };
  const { error } = await v.supabase.rpc("host_decide", { p_request: requestId, p_group: approve ? groupId : null, p_approve: approve });
  if (error) return { error: error.message.includes("Choose") ? "Choose a public group." : error.message.includes("already") ? "Someone on the team already decided this one." : "That didn’t save. Try again." };
  revalidatePath("/moderation");
  revalidatePath("/groups", "layout");
  return { ok: true };
}
