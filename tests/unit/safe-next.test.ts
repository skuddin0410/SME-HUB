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
  const site = "https://smehub.ca";
  it("takes the path from a same-site address", () => expect(nextFromRedirect("https://smehub.ca/groups?x=1", site)).toBe("/groups?x=1"));
  it("ignores other sites", () => expect(nextFromRedirect("https://evil.com/feed", site)).toBe("/feed"));
  it("survives junk", () => expect(nextFromRedirect("http://[::1", site)).toBe("/feed"));
  it("unwraps the code-exchange route", () => expect(nextFromRedirect("https://smehub.ca/auth/callback?next=/groups", site)).toBe("/groups"));
  it("unwraps safely", () => expect(nextFromRedirect("https://smehub.ca/auth/callback?next=//evil.com", site)).toBe("/feed"));
  it("falls back when empty", () => expect(nextFromRedirect("", site)).toBe("/feed"));
});

describe("passwordProblem", () => {
  it("accepts a good password", () => expect(passwordProblem("Maple-Leaf42")).toBeNull());
  it("rejects short", () => expect(passwordProblem("Ab1!")).toMatch(/8 or more/));
  it("rejects over 72 (bcrypt limit)", () => expect(passwordProblem("Aa1".repeat(25))).toMatch(/72/));
  it("needs a number", () => expect(passwordProblem("Maple-Leaf-Syrup")).toMatch(/number/));
  it("needs upper and lower case, or a symbol", () => {
    expect(passwordProblem("mapleleaf42")).toMatch(/upper and lower/i);
    expect(passwordProblem("mapleleaf42!")).toBeNull();
  });
  it("rejects common passwords, whatever the case", () => {
    expect(passwordProblem("Password123")).toMatch(/harder/);
    expect(passwordProblem("password123")).toMatch(/harder/);
  });
  it("rejects the email name inside", () => expect(passwordProblem("Syedrahman99!", "syedrahman@x.ca")).toMatch(/email/));
});
