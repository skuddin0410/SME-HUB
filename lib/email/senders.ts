/**
 * The addresses SME Hub sends from (Update 1). Each has its own job, so a burst of notifications
 * can never hurt delivery of sign-in and password emails. Set up SPF, DKIM and DMARC for the domain first.
 *
 * - hello: welcome, community, network, digests, events
 * - security: password reset, password changed, new sign-in, email changed
 * - billing: receipts, failed payments, renewals, cancellations
 * - business: business page reviews, approvals, quote requests
 * - community: group and blog approvals, report outcomes, content removal, Hub team alerts
 */
export type Sender = "hello" | "security" | "billing" | "business" | "community";

export const BRAND = "SME Hub";

const DISPLAY: Record<Sender, string> = {
  hello: "SME Hub",
  security: "SME Hub Security",
  billing: "SME Hub Billing",
  business: "SME Hub Business",
  community: "SME Hub Community Team",
};

export const SENDERS = Object.keys(DISPLAY) as Sender[];

/** The sending domain. Override with EMAIL_DOMAIN (for a staging domain, say). */
export function emailDomain() {
  return (process.env.EMAIL_DOMAIN ?? "smehub.ca").trim().toLowerCase();
}

/** Every email goes out from the one inbox the team reads, support@ (each sender keeps its own name). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers still say which sender
export function senderAddress(_sender: Sender) {
  return `support@${emailDomain()}`;
}

/** "SME Hub Security <support@smehub.ca>" */
export function fromHeader(sender: Sender) {
  return `${DISPLAY[sender]} <${senderAddress(sender)}>`;
}

/** Where a reply should land: support@, the inbox people read. */
export function replyTo() {
  return `support@${emailDomain()}`;
}

/** The sender key for a catalogue line such as "SME Hub Security <security@smehub.ca>". */
export function senderFromCatalogue(line: string): Sender {
  const local = /<([a-z]+)@/.exec(line)?.[1] as Sender | undefined;
  if (!local || !(local in DISPLAY)) throw new Error(`Unknown sender in catalogue: ${line}`);
  return local;
}
