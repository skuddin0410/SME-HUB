import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks a Standard Webhooks signature, the scheme Supabase Auth hooks use.
 * Secret format from the Supabase dashboard: "v1,whsec_<base64>".
 * Signed content: "<webhook-id>.<webhook-timestamp>.<raw body>", HMAC-SHA256, base64.
 * Rejects anything older or newer than five minutes, so a captured request cannot be replayed later.
 */
export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(nowSeconds - ts) > toleranceSeconds) return false;

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  // the header may carry several signatures, space separated, each "v1,<base64>"
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** For tests and local tools: produce a valid signature header. */
export function signWebhook(secret: string, id: string, timestamp: number, body: string) {
  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}
