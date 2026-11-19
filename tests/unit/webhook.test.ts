import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhook } from "@/lib/auth/webhook";

const secret = `v1,whsec_${Buffer.from("a-test-secret-of-decent-length").toString("base64")}`;
const body = JSON.stringify({ hello: "world" });
const now = 1_800_000_000;
const sig = signWebhook(secret, "msg_1", now, body);
const h = (over: Partial<{ id: string | null; timestamp: string | null; signature: string | null }> = {}) => ({
  id: "msg_1",
  timestamp: String(now),
  signature: sig,
  ...over,
});

describe("verifyWebhook", () => {
  it("accepts a correctly signed request", () => expect(verifyWebhook(secret, h(), body, now)).toBe(true));
  it("accepts when one of several signatures matches", () => expect(verifyWebhook(secret, h({ signature: `v1,AAAA ${sig}` }), body, now)).toBe(true));
  it("rejects a changed body", () => expect(verifyWebhook(secret, h(), body + " ", now)).toBe(false));
  it("rejects another secret", () => expect(verifyWebhook(`v1,whsec_${Buffer.from("other").toString("base64")}`, h(), body, now)).toBe(false));
  it("rejects old requests (replay)", () => expect(verifyWebhook(secret, h(), body, now + 301)).toBe(false));
  it("rejects requests from the future", () => expect(verifyWebhook(secret, h(), body, now - 301)).toBe(false));
  it("rejects missing headers", () => {
    expect(verifyWebhook(secret, h({ id: null }), body, now)).toBe(false);
    expect(verifyWebhook(secret, h({ signature: null }), body, now)).toBe(false);
    expect(verifyWebhook("", h(), body, now)).toBe(false);
  });
  it("rejects a wrong version tag", () => expect(verifyWebhook(secret, h({ signature: sig.replace("v1,", "v2,") }), body, now)).toBe(false));
  it("rejects a changed id", () => expect(verifyWebhook(secret, h({ id: "msg_2" }), body, now)).toBe(false));
});
