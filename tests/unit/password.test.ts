import { describe, expect, it, vi } from "vitest";
import { isBreached, passwordChecks, passwordOk, passwordScore } from "@/lib/auth/password";

describe("password rules (the sign-in pages' checklist)", () => {
  it("ticks each rule on its own", () => {
    expect(passwordChecks("abcdefgh")).toEqual({ len: true, num: false, mix: false, common: true });
    expect(passwordChecks("Abcdefg1")).toEqual({ len: true, num: true, mix: true, common: true });
    expect(passwordChecks("abc1!")).toMatchObject({ len: false, num: true, mix: true });
  });
  it("a symbol stands in for mixed case", () => expect(passwordChecks("lowercase1!").mix).toBe(true));
  it("flags common passwords and the person's own email name", () => {
    expect(passwordChecks("Password123").common).toBe(false); // case does not hide it
    expect(passwordChecks("password123").common).toBe(false);
    expect(passwordChecks("Maple-Leaf-42").common).toBe(true);
    expect(passwordChecks("Syed2026ok!", "syed@x.ca").common).toBe(false);
  });
  it("fills 0 to 4 bars", () => {
    expect(passwordScore("")).toBe(0);
    expect(passwordScore("a")).toBe(1);
    expect(passwordScore("password123")).toBe(1);
    expect(passwordScore("Abcdefg1")).toBe(3);
    expect(passwordScore("Abcdefg1xyz9")).toBe(4);
  });
  it("passwordOk needs all four rules", () => {
    expect(passwordOk("Abcdefg1")).toBe(true);
    expect(passwordOk("abcdefgh")).toBe(false);
  });
});

describe("isBreached", () => {
  // SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
  const reply = (body: string, status = 200) => vi.fn().mockResolvedValue(new Response(body, { status }));
  it("sends only the first five characters and finds the rest", async () => {
    const f = reply("1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:0");
    expect(await isBreached("password", f)).toBe(true);
    expect(f.mock.calls[0][0]).toBe("https://api.pwnedpasswords.com/range/5BAA6");
  });
  it("ignores padding rows with a zero count", async () => {
    expect(await isBreached("password", reply("1E4C9B93F3F0682250B6CF8331B7EE68FD8:0"))).toBe(false);
  });
  it("is false when the password is not listed", async () => expect(await isBreached("Zq!9-not-in-any-list", reply("AAAA:3"))).toBe(false));
  it("lets the password through when the service is down", async () => {
    expect(await isBreached("password", reply("down", 503))).toBe(false);
    expect(await isBreached("password", vi.fn().mockRejectedValue(new Error("offline")))).toBe(false);
  });
});
