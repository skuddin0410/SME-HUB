import { describe, expect, it } from "vitest";
import { buildAuthEmails, confirmLink, type HookPayload } from "@/lib/auth/hook-emails";

const site = "https://smehub.ca";
const payload = (type: string, extra: Partial<HookPayload["email_data"]> = {}, user: Partial<HookPayload["user"]> = {}): HookPayload => ({
  user: { email: "ana@example.com", ...user },
  email_data: { token: "123456", token_hash: "hash-a", redirect_to: "https://smehub.ca/feed", email_action_type: type, site_url: "x", token_new: "", token_hash_new: "", ...extra },
});
/** every address the email links to, decoded */
const links = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => decodeURIComponent(m[1].replace(/&amp;/g, "&").replace(/&#x3D;/g, "=")));
const confirm = (html: string) => links(html).find((l) => l.includes("/auth/confirm")) ?? "";

describe("confirmLink", () => {
  it("points to our confirm page with the token", () => {
    const u = new URL(confirmLink(site, "abc", "email", "/feed"));
    expect(u.origin + u.pathname).toBe("https://smehub.ca/auth/confirm");
    expect(u.searchParams.get("token_hash")).toBe("abc");
    expect(u.searchParams.get("type")).toBe("email");
    expect(u.searchParams.get("next")).toBe("/feed");
  });
});

describe("buildAuthEmails", () => {
  it("signup: one confirm email with the link and the 6-digit code", async () => {
    const [m, ...rest] = await buildAuthEmails(payload("signup"), site);
    expect(rest).toHaveLength(0);
    expect(m.to).toBe("ana@example.com");
    expect(m.message.from).toBe("hello");
    expect(m.message.subject).toBe("Confirm your email address");
    expect(confirm(m.message.html)).toContain("/auth/confirm?token_hash=hash-a&type=email&next=/feed");
    expect(m.message.html).toContain("123456");
    expect(m.message.text).toContain("123456");
    expect(m.message.html).toContain("60 minutes");
  });
  it("recovery: sent from security@, always lands on the new password page", async () => {
    const [m] = await buildAuthEmails(payload("recovery", { redirect_to: "https://smehub.ca/groups" }), site);
    expect(m.message.from).toBe("security");
    expect(m.message.subject).toBe("Reset your SME Hub password");
    expect(confirm(m.message.html)).toContain("type=recovery&next=/auth/update-password");
  });
  it("never puts another site into next", async () => {
    const [m] = await buildAuthEmails(payload("signup", { redirect_to: "https://evil.com/steal" }), site);
    expect(confirm(m.message.html)).toContain("next=/feed");
    expect(m.message.html).not.toContain("evil.com");
  });
  it("secure email change: new address gets token_hash, current address gets token_hash_new", async () => {
    const mails = await buildAuthEmails(payload("email_change", { token_hash: "for-new", token_hash_new: "for-current" }, { new_email: "ana@new.ca" }), site);
    expect(mails).toHaveLength(2);
    const toNew = mails.find((m) => m.to === "ana@new.ca")!;
    const toCurrent = mails.find((m) => m.to === "ana@example.com")!;
    expect(toNew.message.subject).toBe("Confirm your new email address");
    expect(toCurrent.message.subject).toBe("Approve the email change on your SME Hub account");
    expect(confirm(toNew.message.html)).toContain("token_hash=for-new");
    expect(confirm(toCurrent.message.html)).toContain("token_hash=for-current");
  });
  it("plain email change: one email to the new address", async () => {
    const mails = await buildAuthEmails(payload("email_change", { token_hash: "only" }, { new_email: "ana@new.ca" }), site);
    expect(mails.map((m) => m.to)).toEqual(["ana@new.ca"]);
  });
  it("reauthentication and magic link send the code, not a link", async () => {
    for (const type of ["reauthentication", "magiclink"]) {
      const [m] = await buildAuthEmails(payload(type), site);
      expect(m.message.subject).toBe("Your SME Hub sign-in code: 123456");
      expect(m.message.text).toContain("123456");
      expect(m.message.html).not.toContain("/auth/confirm");
    }
  });
  it("invite sends the confirm link on to choosing a password", async () => {
    const [m] = await buildAuthEmails(payload("invite"), site);
    expect(confirm(m.message.html)).toContain("type=invite&next=/auth/update-password");
  });
  it("says Not available instead of making up a device or place", async () => {
    const [m] = await buildAuthEmails(payload("recovery"), site);
    expect(m.message.html).toContain("Not available");
  });
  it("refuses unknown types and broken email changes", async () => {
    await expect(buildAuthEmails(payload("teleport"), site)).rejects.toThrow(/Unsupported/);
    await expect(buildAuthEmails(payload("email_change"), site)).rejects.toThrow(/new address/);
  });
});
