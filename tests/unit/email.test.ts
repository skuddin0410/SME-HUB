import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromHeader, replyTo, senderAddress } from "@/lib/email/senders";
import { escapeHtml, greetingName, templates } from "@/lib/email/templates";
import { EmailError, sendEmail } from "@/lib/email/send";

describe("senders", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses smbhub.ca by default", () => {
    expect(senderAddress("accounts")).toBe("accounts@smbhub.ca");
    expect(fromHeader("info")).toBe("SMB Hub <info@smbhub.ca>");
  });
  it("can switch domain", () => {
    vi.stubEnv("EMAIL_DOMAIN", "Staging.SMBHub.ca");
    expect(senderAddress("notifications")).toBe("notifications@staging.smbhub.ca");
  });
  it("sends replies to info, except for account emails", () => {
    expect(replyTo("accounts")).toBeUndefined();
    expect(replyTo("notifications")).toBe("info@smbhub.ca");
    expect(replyTo("info")).toBe("info@smbhub.ca");
  });
});

describe("templates", () => {
  it("escapes names so nobody can inject markup", () => {
    const m = templates.welcome('<img src=x onerror="hack()">', "https://smbhub.ca");
    expect(m.html).not.toContain("<img src=x");
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
  it("greets by first name, with a safe default", () => {
    expect(greetingName("Syed Abdur Rahman")).toBe("Syed");
    expect(greetingName("  ")).toBe("there");
    expect(greetingName(null)).toBe("there");
  });
  it("every template has subject, html and text", () => {
    const all = [
      templates.confirmSignup("https://smbhub.ca/a"),
      templates.resetPassword("https://smbhub.ca/a"),
      templates.magicLink("https://smbhub.ca/a"),
      templates.invite("https://smbhub.ca/a"),
      templates.emailChangeNew("https://smbhub.ca/a", "n@x.ca"),
      templates.emailChangeCurrent("https://smbhub.ca/a", "n@x.ca"),
      templates.reauthentication("999111"),
      templates.welcome("Ana", "https://smbhub.ca"),
      templates.passwordChanged("Ana", "https://smbhub.ca", new Date(0)),
    ];
    for (const t of all) {
      expect(t.subject.length).toBeGreaterThan(5);
      expect(t.html).toMatch(/^<!doctype html>/);
      expect(t.text).toContain("SMB Hub");
    }
  });
  it("welcome links to profile editing; password notice links to reset", () => {
    expect(templates.welcome("Ana", "https://smbhub.ca").html).toContain("https://smbhub.ca/profile/edit");
    expect(templates.passwordChanged("Ana", "https://smbhub.ca", new Date()).html).toContain("/auth/forgot-password");
  });
});

describe("sendEmail", () => {
  const msg = { from: "accounts" as const, to: "ana@example.com", subject: "S", html: "<p>h</p>", text: "t" };
  const ok = () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 });
  beforeEach(() => vi.stubEnv("RESEND_API_KEY", "re_test"));
  afterEach(() => vi.unstubAllEnvs());

  it("posts to Resend with the right sender, auth and idempotency key", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    await expect(sendEmail({ ...msg, from: "info", idempotencyKey: "welcome-1" }, f)).resolves.toEqual({ id: "em_1" });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(init.headers["Idempotency-Key"]).toBe("welcome-1");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("SMB Hub <info@smbhub.ca>");
    expect(body.reply_to).toBe("info@smbhub.ca");
    expect(body.to).toEqual(["ana@example.com"]);
  });
  it("account emails carry no reply-to", async () => {
    const f = vi.fn().mockResolvedValue(ok());
    await sendEmail(msg, f);
    expect(JSON.parse(f.mock.calls[0][1].body).reply_to).toBeUndefined();
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
