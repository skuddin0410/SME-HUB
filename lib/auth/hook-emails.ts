import { commonVars, renderEmail, type CatalogueRendered } from "@/lib/email/render";
import { NOT_KNOWN, whenET } from "@/lib/email/context";
import { nextFromRedirect } from "./safe-next";

/** What Supabase Auth sends to the Send Email hook. */
export type HookPayload = {
  user: { id?: string; email: string; new_email?: string; email_new?: string; user_metadata?: { full_name?: string; first_name?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
};

export type OutgoingEmail = { to: string; message: CatalogueRendered };

/** How long Supabase keeps a link or code (Authentication > Email OTP expiration, 3600 seconds). */
export const LINK_MINUTES = 60;

/** The link in an email: our own confirm page, which signs the person in and moves on. */
export function confirmLink(siteUrl: string, tokenHash: string, type: string, next: string) {
  const url = new URL("/auth/confirm", siteUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Turns one hook call into the emails to send, using the SME Hub templates. Every case is unit tested.
 * The hook does not tell us the device or place of the request, so those rows say "Not available"
 * rather than guess.
 *
 * Email change quirk (Supabase docs): token_hash_new belongs to the CURRENT address and
 * token_hash to the NEW address. With secure email change on, both are present: two emails.
 */
export async function buildAuthEmails(payload: HookPayload, siteUrl: string): Promise<OutgoingEmail[]> {
  const { user, email_data: d } = payload;
  const next = nextFromRedirect(d.redirect_to, siteUrl);
  const link = (hash: string, type: string, to = next) => confirmLink(siteUrl, hash, type, to);
  const newEmail = user.new_email || user.email_new || "";
  const first = user.user_metadata?.first_name || user.user_metadata?.full_name;
  const base = { ...commonVars(siteUrl, first), email: user.email, expires_minutes: LINK_MINUTES, changed_at: whenET(), device: NOT_KNOWN, location: NOT_KNOWN };
  const one = async (id: string, to: string, vars: Record<string, unknown>): Promise<OutgoingEmail[]> => [{ to, message: await renderEmail(id, { ...base, ...vars }) }];

  switch (d.email_action_type) {
    case "signup":
    case "email":
    case "invite":
      return one("verify-email", user.email, { verify_url: link(d.token_hash, d.email_action_type === "invite" ? "invite" : "email", d.email_action_type === "invite" ? "/auth/update-password" : next), verify_code: d.token });
    case "recovery":
      return one("password-reset", user.email, { reset_url: link(d.token_hash, "recovery", "/auth/update-password") });
    case "magiclink":
    case "reauthentication":
      return one("signin-code", user.email, { signin_code: d.token, reset_url: `${siteUrl.replace(/\/$/, "")}/auth/forgot-password` });
    case "email_change": {
      if (!newEmail) throw new Error("email_change without a new address");
      const out: OutgoingEmail[] = [];
      if (d.token_hash) out.push(...(await one("confirm-new-email", newEmail, { new_email: newEmail, confirm_new_url: link(d.token_hash, "email_change", "/profile/edit") })));
      if (d.token_hash_new) out.push(...(await one("approve-email-change", user.email, { new_email: newEmail, confirm_new_url: link(d.token_hash_new, "email_change", "/profile/edit") })));
      return out;
    }
    default:
      throw new Error(`Unsupported email type: ${d.email_action_type}`);
  }
}
