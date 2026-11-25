import "server-only";
import { commonVars, renderEmail } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";
import { serviceClient } from "@/lib/supabase/service";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://smehub.ca").replace(/\/$/, "");
}

/** A member's email address. Only the server can look it up, with the service key; without it, nothing is sent. */
export async function memberEmail(id: string): Promise<{ email: string; name: string } | null> {
  const db = serviceClient();
  if (!db) return null;
  try {
    const { data } = await db.auth.admin.getUserById(id);
    const { data: p } = await db.from("profiles").select("full_name").eq("id", id).maybeSingle();
    return data.user?.email ? { email: data.user.email, name: (p as { full_name?: string } | null)?.full_name ?? "" } : null;
  } catch {
    return null;
  }
}

/** Sends one course email. Never throws: a failed email must not undo an enrolment, a grade or a purchase. */
export async function courseMail(id: string, to: { email: string; name?: string | null } | null, vars: Record<string, unknown>, key?: string, replyTo?: string) {
  if (!to?.email) return;
  try {
    const msg = await renderEmail(id, { ...commonVars(siteUrl(), to.name), ...vars });
    await sendEmail({ to: to.email, idempotencyKey: key, replyTo, ...msg });
  } catch (e) {
    console.error(`course email ${id}:`, (e as Error).message);
  }
}

/** The Hub team's inbox for team alerts (a server setting, with the hand-off's address as the default). */
export const teamInbox = () => ({ email: process.env.HUB_TEAM_EMAIL || "community@smehub.ca", name: "Hub team" });
