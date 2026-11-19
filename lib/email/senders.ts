/**
 * The three addresses SMB Hub sends from. Each one has its own job, so a burst of
 * notifications can never hurt delivery of sign-in and password emails.
 *
 * - accounts: confirm email, reset password, password changed, email change. Not monitored.
 * - info: the welcome email and anything a person might answer. A real, monitored inbox.
 * - notifications: connection requests, messages, comments, reminders. Replies go to info.
 */
export type Sender = "accounts" | "info" | "notifications";

export const BRAND = "SMB Hub";

/** The sending domain. Override with EMAIL_DOMAIN (for a staging domain, say). */
export function emailDomain() {
  return (process.env.EMAIL_DOMAIN ?? "smbhub.ca").trim().toLowerCase();
}

export function senderAddress(sender: Sender) {
  return `${sender}@${emailDomain()}`;
}

/** "SMB Hub <accounts@smbhub.ca>" */
export function fromHeader(sender: Sender) {
  return `${BRAND} <${senderAddress(sender)}>`;
}

/** Where a reply should land. Only info@ is read by people. */
export function replyTo(sender: Sender) {
  return sender === "accounts" ? undefined : senderAddress("info");
}
