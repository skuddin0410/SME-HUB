import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromHeader, replyTo, senderAddress, senderFromCatalogue, SENDERS } from "@/lib/email/senders";
import { CATALOGUE, commonVars, renderEmail } from "@/lib/email/render";
import { LOADERS } from "@/lib/email/generated/loaders";
import { deviceFromUserAgent, maskIp, whenET } from "@/lib/email/context";
import { EmailError, sendEmail } from "@/lib/email/send";

describe("senders", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses smehub.ca by default", () => {
    expect(senderAddress("security")).toBe("security@smehub.ca");
    expect(fromHeader("hello")).toBe("SME Hub <hello@smehub.ca>");
    expect(fromHeader("community")).toBe("SME Hub Community Team <community@smehub.ca>");
  });
  it("can switch domain", () => {
    vi.stubEnv("EMAIL_DOMAIN", "Staging.SMEHub.ca");
    expect(senderAddress("billing")).toBe("billing@staging.smehub.ca");
  });
  it("sends replies to support@", () => {
    expect(replyTo()).toBe("support@smehub.ca");
  });
  it("reads the sender out of a catalogue line", () => {
    expect(senderFromCatalogue("SME Hub Security <security@smehub.ca>")).toBe("security");
    expect(() => senderFromCatalogue("Someone <who@smehub.ca>")).toThrow(/Unknown sender/);
  });
});

describe("the email catalogue (Update 1)", () => {
  it("has a template, a text version and a known sender for every email", async () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(87);
    for (const e of CATALOGUE) {
      expect(LOADERS[e.id], e.id).toBeTypeOf("function");
      expect(SENDERS).toContain(senderFromCatalogue(e.sender));
    }
  });
  it("renders every email with its own variables, with no placeholder left and no old name", async () => {
    for (const e of CATALOGUE) {
      const vars: Record<string, unknown> = { ...commonVars("https://smehub.ca", "Alex") };
      for (const v of e.variables) vars[v] = `v_${v}`;
      for (const l of e.lists) vars[l] = [{ photo_url: "https://x/p.jpg", name: "N", role: "R", why: "W", url: "https://x" }];
      // true/false switches show their block
      const m = await renderEmail(e.id, vars);
      for (const part of [m.subject, m.html, m.text]) {
        expect(part, `${e.id}`).not.toMatch(/\{\{/);
        expect(part, `${e.id}`).not.toMatch(/SMB Hub|SMB Advisor/);
      }
      expect(m.html.length).toBeGreaterThan(2000);
      expect(m.html).toContain("/email-assets/logo.png");
    }
  });
  it("escapes a member's name so nobody can inject markup", async () => {
    const m = await renderEmail("welcome", { ...commonVars("https://smehub.ca", '<img src=x onerror="hack()">'), welcome_faces: [] });
    expect(m.html).not.toContain("<img src=x");
    expect(m.html).toContain("&lt;img");
  });
  it("greets by first name only, with a safe default", () => {
    expect(commonVars("https://smehub.ca", "Syed Abdur Rahman").first_name).toBe("Syed");
    expect(commonVars("https://smehub.ca", "  ").first_name).toBe("there");
    expect(commonVars("https://smehub.ca/", null).first_name).toBe("there");
    expect(commonVars("https://smehub.ca/").hub_url).toBe("https://smehub.ca");
  });
  it("shows the Founding Member note only when asked", async () => {
    const base = { ...commonVars("https://smehub.ca", "Alex"), welcome_faces: [], member_count: 12 };
    expect((await renderEmail("welcome", { ...base, founding_member: true })).html).toContain("Founding Member");
    expect((await renderEmail("welcome", { ...base, founding_member: false })).html).not.toContain("Founding Member");
  });
  it("security emails say where and when, in Eastern time", () => {
    expect(whenET(new Date("2026-11-24T20:05:00Z"))).toBe("November 24, 2026, 3:05 PM ET");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64) Chrome/120 Safari/537")).toBe("Chrome on Windows");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17) Safari/604")).toBe("Safari on iOS");
    expect(deviceFromUserAgent(null)).toBe("Not available");
    expect(maskIp("203.0.113.45")).toBe("203.0.•••.•••");
    expect(maskIp(undefined)).toBe("Not available");
  });
});

describe("sendEmail", () => {
  const msg = { from: "security" as const, to: "ana@example.com", subject: "S", html: "<p>h</p>", text: "t" };
  const ok = () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
  beforeEach(() => vi.stubEnv("RESEND_API_KEY", "re_test"));
  afterEach(() => vi.unstubAllEnvs());

  it("posts to Resend with the right sender, auth and idempotency key", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    await expect(sendEmail({ ...msg, from: "hello", idempotencyKey: "welcome-1" }, f)).resolves.toEqual({ id: "em_1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(init.headers["Idempotency-Key"]).toBe("welcome-1");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("SME Hub <hello@smehub.ca>");
    expect(body.reply_to).toBe("support@smehub.ca");
    expect(body.to).toEqual(["ana@example.com"]);
  });
  it("security emails send from security@", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    await sendEmail(msg, f);
    expect(JSON.parse(f.mock.calls[0][1].body).from).toBe("SME Hub Security <security@smehub.ca>");
  });
  it("retries once on a provider error, then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response("down", { status: 503 })).mockResolvedValueOnce(ok());
    await expect(sendEmail(msg, f)).resolves.toEqual({ id: "em_1" });
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("does not retry a 4xx mistake and reports it", async () => {
    const f = vi.fn().mockResolvedValue(new Response("bad", { status: 422 }));
    await expect(sendEmail(msg, f)).rejects.toBeInstanceOf(EmailError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("refuses a bad recipient without calling the provider", async () => {
    const f = vi.fn();
    await expect(sendEmail({ ...msg, to: "not an email" }, f)).rejects.toThrow(/recipient/);
    expect(f).not.toHaveBeenCalled();
  });
  it("without a key: skips in development, throws in production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const f = vi.fn();
    await expect(sendEmail(msg, f)).resolves.toEqual({ skipped: true });
    vi.stubEnv("NODE_ENV", "production");
    await expect(sendEmail(msg, f)).rejects.toThrow(/RESEND_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });
});
