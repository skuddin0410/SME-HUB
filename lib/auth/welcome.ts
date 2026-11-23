import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { commonVars, renderEmail } from "@/lib/email/render";

/** The handoff's rule: the first 500 members keep a Founding Member badge. */
export const FOUNDING_LIMIT = 500;

/**
 * Sends the welcome email the first time an account is confirmed or first signs in with Google
 * or LinkedIn. The database claim makes it exactly once, however often this runs.
 * Numbers in the email are real: the member count and the faces come from the hub's own members.
 * Never throws: a failed welcome must not stop someone signing in.
 */
export async function sendWelcomeOnce(supabase: SupabaseClient, user: User, siteUrl: string) {
  try {
    if (!user.email) return;
    const { data: claimed } = await supabase.rpc("claim_welcome_email");
    if (claimed !== true) return;
    const meta = user.user_metadata ?? {};
    const name = (meta.first_name ?? meta.full_name ?? meta.name ?? "") as string;
    const [{ count }, { data: faces }, { data: me }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("avatar_url").not("avatar_url", "is", null).neq("id", user.id).order("created_at", { ascending: false }).limit(6),
      supabase.from("profiles").select("founding_number").eq("id", user.id).maybeSingle(),
    ]);
    const site = siteUrl.replace(/\/$/, "");
    const founding = (me as { founding_number?: number | null } | null)?.founding_number;
    const message = await renderEmail("welcome", {
      ...commonVars(site, name),
      member_count: count ?? 0,
      founding_member: typeof founding === "number" && founding <= FOUNDING_LIMIT,
      welcome_faces: ((faces ?? []) as { avatar_url: string }[]).map((f) => ({ photo_url: f.avatar_url })),
      profile_url: `${site}/profile/edit`,
      meet_url: `${site}/network`,
      group_url: `${site}/groups`,
      digest_url: `${site}/settings`,
    });
    await sendEmail({ to: user.email, idempotencyKey: `welcome-${user.id}`, ...message });
  } catch (e) {
    console.error("welcome email:", (e as Error).message);
  }
}
