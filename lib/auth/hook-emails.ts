import { templates, type Rendered } from "@/lib/email/templates";
import { nextFromRedirect } from "./safe-next";

/** What Supabase Auth sends to the Send Email hook. */
export type HookPayload = {
  user: { id?: string; email: string; new_email?: string; email_new?: string; user_metadata?: { full_name?: string } };
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

export type OutgoingEmail = { to: string; message: Rendered };

/** The link in an email: our own confirm page, which signs the person in and moves on. */
export function confirmLink(siteUrl: string, tokenHash: string, type: string, next: string) {
  const url = new URL("/auth/confirm", siteUrl);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Turns one hook call into the emails to send. Pure, so every case is unit tested.
 *
 * Email change quirk (Supabase docs): token_hash_new belongs to the CURRENT address and
 * token_hash to the NEW address. With secure email change on, both are present: two emails.
 */
export function buildAuthEmails(payload: HookPayload, siteUrl: string): OutgoingEmail[] {
  const { user, email_data: d } = payload;
  const next = nextFromRedirect(d.redirect_to, siteUrl);
  const link = (hash: string, type: string, to = next) => confirmLink(siteUrl, hash, type, to);
  const newEmail = user.new_email || user.email_new || "";

  switch (d.email_action_type) {
    case "signup":
      return [{ to: user.email, message: templates.confirmSignup(link(d.token_hash, "email")) }];
    case "recovery":
      return [{ to: user.email, message: templates.resetPassword(link(d.token_hash, "recovery", "/auth/update-password")) }];
    case "magiclink":
      return [{ to: user.email, message: templates.magicLink(link(d.token_hash, "magiclink")) }];
    case "invite":
      return [{ to: user.email, message: templates.invite(link(d.token_hash, "invite", "/auth/update-password")) }];
    case "email":
      return [{ to: user.email, message: templates.confirmSignup(link(d.token_hash, "email")) }];
    case "reauthentication":
      return [{ to: user.email, message: templates.reauthentication(d.token) }];
    case "email_change": {
      if (!newEmail) throw new Error("email_change without a new address");
      const out: OutgoingEmail[] = [];
      if (d.token_hash) out.push({ to: newEmail, message: templates.emailChangeNew(link(d.token_hash, "email_change", "/profile/edit"), newEmail) });
      if (d.token_hash_new) out.push({ to: user.email, message: templates.emailChangeCurrent(link(d.token_hash_new, "email_change", "/profile/edit"), newEmail) });
      return out;
    }
    default:
      throw new Error(`Unsupported email type: ${d.email_action_type}`);
  }
}
