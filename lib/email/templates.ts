import { BRAND, senderAddress } from "./senders";

export type Rendered = { subject: string; html: string; text: string };

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A first name to greet someone by, never markup and never empty. */
export function greetingName(fullName?: string | null) {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  return first.slice(0, 40) || "there";
}

type Block = { kind: "p"; text: string } | { kind: "button"; label: string; href: string } | { kind: "code"; code: string } | { kind: "small"; text: string };

/**
 * One layout for every email: plain table markup that renders the same in Gmail, Outlook and
 * Apple Mail, with a text version for clients that do not show HTML.
 */
function layout(subject: string, preheader: string, blocks: Block[]): Rendered {
  const parts = blocks.map((b) => {
    switch (b.kind) {
      case "p":
        return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#1f2937">${escapeHtml(b.text)}</p>`;
      case "small":
        return `<p style="margin:16px 0 0;font-size:13px;line-height:20px;color:#6b7280">${escapeHtml(b.text)}</p>`;
      case "code":
        return `<p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700;color:#0b1437">${escapeHtml(b.code)}</p>`;
      case "button":
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:6px;background:#0a66c2"><a href="${escapeHtml(b.href)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px">${escapeHtml(b.label)}</a></td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6b7280">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(b.href)}" style="color:#0a66c2;word-break:break-all">${escapeHtml(b.href)}</a></p>`;
    }
  });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f2ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ee;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e0dfdc;border-radius:8px">
<tr><td style="padding:22px 28px;border-bottom:1px solid #e8e8e8;font-size:18px;font-weight:700;color:#0b1437">${BRAND}</td></tr>
<tr><td style="padding:28px">${parts.join("\n")}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:18px;color:#6b7280">${BRAND}, by Cmarketing Inc. You are getting this because of an action on your ${BRAND} account.</p>
</td></tr></table></body></html>`;
  const text = blocks
    .map((b) => (b.kind === "button" ? `${b.label}: ${b.href}` : b.kind === "code" ? b.code : b.text))
    .concat(["", `${BRAND}, by Cmarketing Inc.`])
    .join("\n\n");
  return { subject, html, text };
}

const IGNORE = "If you did not ask for this, you can ignore this email. Nothing changes until the link is used.";

export const templates = {
  confirmSignup: (link: string) =>
    layout(`Confirm your email for ${BRAND}`, "One click and you are in.", [
      { kind: "p", text: `Welcome to ${BRAND}. Confirm your email address to finish creating your account. The link signs you in.` },
      { kind: "button", label: "Confirm my email", href: link },
      { kind: "small", text: `The link works once and expires in 1 hour. ${IGNORE}` },
    ]),

  resetPassword: (link: string) =>
    layout(`Reset your ${BRAND} password`, "Choose a new password.", [
      { kind: "p", text: "We got a request to reset the password for your account. Use the button to choose a new one." },
      { kind: "button", label: "Choose a new password", href: link },
      { kind: "small", text: `The link works once and expires in 1 hour. ${IGNORE}` },
    ]),

  magicLink: (link: string) =>
    layout(`Your ${BRAND} sign-in link`, "Sign in with one click.", [
      { kind: "p", text: "Use the button to sign in to your account." },
      { kind: "button", label: "Sign in", href: link },
      { kind: "small", text: `The link works once and expires in 1 hour. ${IGNORE}` },
    ]),

  invite: (link: string) =>
    layout(`You are invited to ${BRAND}`, "Accept your invitation.", [
      { kind: "p", text: `You have been invited to join ${BRAND}, Canada's business network.` },
      { kind: "button", label: "Accept invitation", href: link },
      { kind: "small", text: "If you were not expecting this, you can ignore it." },
    ]),

  emailChangeNew: (link: string, newEmail: string) =>
    layout(`Confirm your new email for ${BRAND}`, "Confirm the change.", [
      { kind: "p", text: `Confirm that ${newEmail} should become the email address for your ${BRAND} account.` },
      { kind: "button", label: "Confirm new email", href: link },
      { kind: "small", text: IGNORE },
    ]),

  emailChangeCurrent: (link: string, newEmail: string) =>
    layout(`Approve the email change on your ${BRAND} account`, "Someone asked to change your email.", [
      { kind: "p", text: `Someone asked to change the email address on your ${BRAND} account to ${newEmail}. Approve it only if this was you.` },
      { kind: "button", label: "Approve the change", href: link },
      { kind: "small", text: `If this was not you, do not click the link, and reset your password. Questions: ${senderAddress("info")}` },
    ]),

  reauthentication: (code: string) =>
    layout(`Your ${BRAND} verification code`, "Your verification code.", [
      { kind: "p", text: "Enter this code to confirm it is you:" },
      { kind: "code", code },
      { kind: "small", text: "The code expires soon. If you did not ask for it, change your password." },
    ]),

  welcome: (fullName: string | null | undefined, siteUrl: string) =>
    layout(`Welcome to ${BRAND}, ${greetingName(fullName)}`, "Here is how to get started.", [
      { kind: "p", text: `Hi ${greetingName(fullName)},` },
      { kind: "p", text: `Your email is confirmed and your ${BRAND} account is ready. Three things to do first:` },
      { kind: "p", text: "1. Add a photo and a headline, so people know who you are." },
      { kind: "p", text: "2. Connect with people you already know." },
      { kind: "p", text: "3. Introduce yourself or your business in a first post." },
      { kind: "button", label: "Complete my profile", href: `${siteUrl}/profile/edit` },
      { kind: "p", text: "Questions? Just reply to this email. A real person reads it." },
      { kind: "p", text: `The ${BRAND} team` },
    ]),

  passwordChanged: (fullName: string | null | undefined, siteUrl: string, when: Date) =>
    layout(`Your ${BRAND} password was changed`, "Your password was just changed.", [
      { kind: "p", text: `Hi ${greetingName(fullName)},` },
      {
        kind: "p",
        text: `The password for your ${BRAND} account was changed on ${when.toUTCString()}. We signed you out on your other devices.`,
      },
      { kind: "p", text: "If this was you, there is nothing else to do." },
      { kind: "p", text: "If it was not you, reset your password now and tell us right away." },
      { kind: "button", label: "Reset my password", href: `${siteUrl}/auth/forgot-password` },
      { kind: "small", text: `Need help? Write to ${senderAddress("info")}` },
    ]),
};
