import "server-only";
import { fromHeader, replyTo, type Sender } from "./senders";
import type { Rendered } from "./render";

export type SendInput = Rendered & {
  from: Sender;
  to: string;
  /** Same key within 24 hours = the provider sends it once, even if we call twice. */
  idempotencyKey?: string;
  /** Overrides the usual reply address for this one message. */
  replyTo?: string;
};

export type SendResult = { id: string } | { skipped: true };

export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

const RESEND_URL = "https://api.resend.com/emails";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends one email through Resend. Retries once on a rate limit or a provider error.
 * Without RESEND_API_KEY: in development the email is printed instead; in production it throws,
 * so a missing key is noticed rather than silently dropping sign-up links.
 */
export async function sendEmail(input: SendInput, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new EmailError("RESEND_API_KEY is not set");
    console.info(`[email skipped: no RESEND_API_KEY] ${input.from} -> ${input.to}: ${input.subject}`);
    return { skipped: true };
  }
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(input.to)) throw new EmailError("Invalid recipient address");

  const body = JSON.stringify({
    from: fromHeader(input.from),
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
    // a message can name its own reply address (the contact inbox replies straight to the sender)
    ...(input.replyTo ? { reply_to: input.replyTo } : replyTo() ? { reply_to: replyTo() } : {}),
  });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
  };

  let last: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await sleep(400);
    try {
      last = await fetchImpl(RESEND_URL, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
    } catch (e) {
      if (attempt) throw new EmailError(`Email provider unreachable: ${(e as Error).message}`);
      continue;
    }
    if (last.ok) {
      const data = (await last.json()) as { id?: string };
      return { id: data.id ?? "" };
    }
    if (last.status !== 429 && last.status < 500) break; // our mistake: retrying will not help
  }
  const detail = last ? await last.text().catch(() => "") : "";
  throw new EmailError(`Email provider refused the message (${last?.status ?? "no response"}) ${detail.slice(0, 200)}`.trim(), last?.status);
}
