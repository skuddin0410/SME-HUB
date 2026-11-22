import { describe, expect, it } from "vitest";
import { cleanSocialUrl, profileStrength, splitList } from "@/lib/profile-extra";

const empty = { avatar_url: null, headline: "", location: "", bio: "", website: "", full_name: "" };

describe("profileStrength", () => {
  it("is 0 for an empty profile and points at the first step", () => {
    const s = profileStrength(empty);
    expect(s.percent).toBe(0);
    expect(s.next).toBe("Add your name");
  });
  it("counts each finished step and names the next one", () => {
    const s = profileStrength({ ...empty, full_name: "Fay", avatar_url: "x", headline: "Baker" });
    expect(s.percent).toBe(30);
    expect(s.next).toBe("Add your city");
  });
  it("needs a real about, not one word", () => {
    expect(profileStrength({ ...empty, bio: "hi" }).remaining).toContain("Write an about (40+ characters)");
  });
  it("reaches 100 with nothing left to do", () => {
    const s = profileStrength({ full_name: "F", avatar_url: "a", headline: "h", location: "l", bio: "x".repeat(40), website: "w", helps_with: ["a"], needs: ["b"], has_business: true, recommendations: 1 });
    expect(s.percent).toBe(100);
    expect(s.next).toBeNull();
  });
});

describe("splitList", () => {
  it("trims, drops blanks and repeats, and caps the count", () => {
    expect(splitList(" a, b ,,a\nc ")).toEqual(["a", "b", "c"]);
    expect(splitList("1,2,3,4", 2)).toEqual(["1", "2"]);
  });
  it("cuts items to 60 characters", () => {
    expect(splitList("x".repeat(100))[0]).toHaveLength(60);
  });
});

describe("cleanSocialUrl", () => {
  it("adds https and upgrades http", () => {
    expect(cleanSocialUrl("linkedin.com/in/fay")).toBe("https://linkedin.com/in/fay");
    expect(cleanSocialUrl("http://x.com/fay")).toBe("https://x.com/fay");
  });
  it("refuses script and data links and blanks", () => {
    expect(cleanSocialUrl("javascript:alert(1)")).toBeNull();
    expect(cleanSocialUrl("https://a b.com")).toBeNull();
    expect(cleanSocialUrl("  ")).toBeNull();
  });
});
