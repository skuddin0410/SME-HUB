import { describe, expect, it } from "vitest";
import { nextFromRedirect, passwordProblem, safeNext } from "@/lib/auth/safe-next";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/feed")).toBe("/feed");
    expect(safeNext("/profile/edit?tab=about")).toBe("/profile/edit?tab=about");
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "", null, undefined, "feed", "/a\nb"])(
    "rejects %s",
    (value) => expect(safeNext(value as string)).toBe("/feed"),
  );
  it("uses the given fallback", () => expect(safeNext("//x", "/home")).toBe("/home"));
});

describe("nextFromRedirect", () => {
  const site = "https://smbhub.ca";
  it("takes the path from a same-site address", () => expect(nextFromRedirect("https://smbhub.ca/groups?x=1", site)).toBe("/groups?x=1"));
  it("ignores other sites", () => expect(nextFromRedirect("https://evil.com/feed", site)).toBe("/feed"));
  it("survives junk", () => expect(nextFromRedirect("http://[::1", site)).toBe("/feed"));
  it("unwraps the code-exchange route", () => expect(nextFromRedirect("https://smbhub.ca/auth/callback?next=/groups", site)).toBe("/groups"));
  it("unwraps safely", () => expect(nextFromRedirect("https://smbhub.ca/auth/callback?next=//evil.com", site)).toBe("/feed"));
  it("falls back when empty", () => expect(nextFromRedirect("", site)).toBe("/feed"));
});

describe("passwordProblem", () => {
  it("accepts a good password", () => expect(passwordProblem("Maple-Leaf42")).toBeNull());
  it("accepts a long passphrase of letters", () => expect(passwordProblem("correcthorsebatterystaple")).toBeNull());
  it("rejects short", () => expect(passwordProblem("Ab1!")).toMatch(/8 or more/));
  it("rejects over 72 (bcrypt limit)", () => expect(passwordProblem("Aa1".repeat(25))).toMatch(/72/));
  it("rejects one repeated character", () => expect(passwordProblem("aaaaaaaaaa")).toMatch(/repeating/));
  it("rejects letters only when short", () => expect(passwordProblem("abcdefgh")).toMatch(/Mix/));
  it("rejects the email name inside", () => expect(passwordProblem("syedrahman99!", "syedrahman@x.ca")).toMatch(/email/));
});
