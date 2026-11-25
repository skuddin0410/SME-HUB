import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/send-email/route";
import { signWebhook } from "@/lib/auth/webhook";
import { SITE_URL } from "@/lib/seo";

// links use the server's own address when one is set (Amplify: https://test.smehub.ca), else the address the request came to
const origin = SITE_URL || "https://smehub.ca";

const secret = `v1,whsec_${Buffer.from("route-test-secret-value").toString("base64")}`;
const body = JSON.stringify({
  user: { email: "ana@example.com" },
  email_data: { token: "1", token_hash: "h1", redirect_to: "https://smehub.ca/feed", email_action_type: "signup", site_url: "", token_new: "", token_hash_new: "" },
});
function request(raw = body, sign = true) {
  const ts = Math.floor(Date.now() / 1000);
  return new NextRequest("https://smehub.ca/api/auth/send-email", {
    method: "POST",
    body: raw,
    headers: {
      host: "smehub.ca",
      "webhook-id": "msg_9",
      "webhook-timestamp": String(ts),
      "webhook-signature": sign ? signWebhook(secret, "msg_9", ts, raw) : "v1,AAAA",
    },
  });
}

describe("POST /api/auth/send-email", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", secret);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_DOMAIN", "smehub.ca");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ id: "em" }), { status: 200 }));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the confirmation from support@ and answers {}", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.from).toBe("SME Hub <support@smehub.ca>");
    expect(sent.html).toContain(`${origin}/auth/confirm?token_hash=h1`);
  });
  it("rejects an unsigned request and sends nothing", async () => {
    const res = await POST(request(body, false));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fails closed when the secret is not configured", async () => {
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", "");
    expect((await POST(request())).status).toBe(500);
  });
  it("reports provider failure in Supabase's error shape", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 500 }));
    const res = await POST(request());
    expect(res.status).toBe(502);
    expect((await res.json()).error.http_code).toBe(502);
  });
});
