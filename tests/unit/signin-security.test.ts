import { describe, expect, it } from "vitest";
import { KEEP_COOKIE, KEEP_SECONDS, withKeep } from "@/lib/supabase/keep";

describe("keep me logged in", () => {
  it("gives the session cookie 30 days when ticked", () => {
    const o = withKeep("sb-abc-auth-token", { path: "/", maxAge: 400 * 86400 }, true);
    expect(o.maxAge).toBe(KEEP_SECONDS);
    expect(o.path).toBe("/");
  });
  it("makes it a browser-session cookie when unticked", () => {
    const o = withKeep("sb-abc-auth-token", { path: "/", maxAge: 400 * 86400, expires: new Date(Date.now() + 1e9) }, false);
    expect(o.maxAge).toBeUndefined();
    expect(o.expires).toBeUndefined();
  });
  it("leaves a cookie that is being removed alone", () => {
    expect(withKeep("sb-abc-auth-token", { maxAge: 0 }, true).maxAge).toBe(0);
    expect(withKeep("sb-abc-auth-token", { expires: new Date(0) }, false).expires).toEqual(new Date(0));
  });
  it("never changes the marker cookie itself", () => {
    expect(withKeep(KEEP_COOKIE, { maxAge: 5 }, false).maxAge).toBe(5);
  });
});
