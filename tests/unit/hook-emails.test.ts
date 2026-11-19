import { describe, expect, it } from "vitest";
import { buildAuthEmails, confirmLink, type HookPayload } from "@/lib/auth/hook-emails";

const site = "https://smbhub.ca";
const payload = (type: string, extra: Partial<HookPayload["email_data"]> = {}, user: Partial<HookPayload["user"]> = {}): HookPayload => ({
  user: { email: "ana@example.com", ...user },
  email_data: { token: "123456", token_hash: "hash-a", redirect_to: "https://smbhub.ca/feed", email_action_type: type, site_url: "x", token_new: "", token_hash_new: "", ...extra },
});
const href = (html: string) => decodeURIComponent(html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, "&"));

describe("confirmLink", () => {
  it("points to our confirm page with the token", () => {
    const u = new URL(confirmLink(site, "abc", "email", "/feed"));
    expect(u.origin + u.pathname).toBe("https://smbhub.ca/auth/confirm");
    expect(u.searchParams.get("token_hash")).toBe("abc");
    expect(u.searchParams.get("type")).toBe("email");
    expect(u.searchParams.get("next")).toBe("/feed");
  });
});

describe("buildAuthEmails", () => {
  it("signup: one confirm email to the person, type email", () => {
    const [m, ...rest] = buildAuthEmails(payload("signup"), site);
    expect(rest).toHaveLength(0);
    expect(m.to).toBe("ana@example.com");
    expect(m.message.subject).toMatch(/Confirm your email/);
    expect(href(m.message.html)).toContain("/auth/confirm?token_hash=hash-a&type=email&next=/feed");
  });
  it("recovery: always lands on the new password page", () => {
    const [m] = buildAuthEmails(payload("recovery", { redirect_to: "https://smbhub.ca/groups" }), site);
    expect(m.message.subject).toMatch(/Reset your/);
    expect(href(m.message.html)).toContain("type=recovery&next=/auth/update-password");
  });
  it("never puts another site into next", () => {
    const [m] = buildAuthEmails(payload("signup", { redirect_to: "https://evil.com/steal" }), site);
    expect(href(m.message.html)).toContain("next=/feed");
    expect(m.message.html).not.toContain("evil.com");
  });
  it("secure email change: new address gets token_hash, current address gets token_hash_new", () => {
    const mails = buildAuthEmails(payload("email_change", { token_hash: "for-new", token_hash_new: "for-current" }, { new_email: "ana@new.ca" }), site);
    expect(mails).toHaveLength(2);
    const toNew = mails.find((m) => m.to === "ana@new.ca")!;
    const toCurrent = mails.find((m) => m.to === "ana@example.com")!;
    expect(href(toNew.message.html)).toContain("token_hash=for-new");
    expect(href(toCurrent.message.html)).toContain("token_hash=for-current");
  });
  it("plain email change: one email to the new address", () => {
    const mails = buildAuthEmails(payload("email_change", { token_hash: "only" }, { new_email: "ana@new.ca" }), site);
    expect(mails.map((m) => m.to)).toEqual(["ana@new.ca"]);
  });
  it("reauthentication sends the code, not a link", () => {
    const [m] = buildAuthEmails(payload("reauthentication"), site);
    expect(m.message.text).toContain("123456");
    expect(m.message.html).not.toContain("/auth/confirm");
  });
  it("magic link and invite", () => {
    expect(href(buildAuthEmails(payload("magiclink"), site)[0].message.html)).toContain("type=magiclink");
    expect(href(buildAuthEmails(payload("invite"), site)[0].message.html)).toContain("type=invite&next=/auth/update-password");
  });
  it("refuses unknown types and broken email changes", () => {
    expect(() => buildAuthEmails(payload("teleport"), site)).toThrow(/Unsupported/);
    expect(() => buildAuthEmails(payload("email_change"), site)).toThrow(/new address/);
  });
});
