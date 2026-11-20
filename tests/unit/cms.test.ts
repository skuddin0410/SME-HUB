import { describe, expect, it } from "vitest";
import { cleanSearch, cmsRewrite, describeEvent, eventHref, eventPerson, pageOf, rangeOf, timeAgo, withParams, type CmsEvent } from "@/lib/cms-format";

const A = "00000000-0000-0000-0000-00000000000a";
const P = "00000000-0000-0000-0000-0000000000f1";
const ev = (e: Partial<CmsEvent>): CmsEvent => ({ id: 1, at: "2026-11-20T10:00:00Z", source: "hub", actor_id: null, action: "insert", entity: "posts", entity_id: null, data: {}, ...e });

describe("paging and filters", () => {
  it("reads page numbers safely", () => {
    expect(pageOf(undefined)).toBe(1);
    expect(pageOf("0")).toBe(1);
    expect(pageOf("-3")).toBe(1);
    expect(pageOf("2.7")).toBe(2);
    expect(pageOf("abc")).toBe(1);
    expect(pageOf("999999")).toBe(10000);
  });
  it("turns a page into a row range", () => {
    expect(rangeOf(1)).toEqual([0, 24]);
    expect(rangeOf(3, 10)).toEqual([20, 29]);
  });
  it("builds links and drops empty filters", () => {
    expect(withParams("/cms/members", { q: "anna", status: "", page: 2 })).toBe("/cms/members?q=anna&page=2");
    expect(withParams("/cms/posts", { q: "" })).toBe("/cms/posts");
  });
  it("strips characters that would break a PostgREST filter", () => {
    expect(cleanSearch("a,b(c)%*:\"'d")).toBe("a b c d");
    expect(cleanSearch("x".repeat(200))).toHaveLength(80);
  });
});

describe("time", () => {
  const now = Date.parse("2026-11-20T12:00:00Z");
  it("says how long ago", () => {
    expect(timeAgo(null)).toBe("never");
    expect(timeAgo("2026-11-20T11:59:50Z", now)).toBe("just now");
    expect(timeAgo("2026-11-20T11:30:00Z", now)).toBe("30m ago");
    expect(timeAgo("2026-11-20T07:00:00Z", now)).toBe("5h ago");
    expect(timeAgo("2026-11-18T12:00:00Z", now)).toBe("2d ago");
  });
});

describe("activity log", () => {
  it("describes hub changes in plain words", () => {
    expect(describeEvent(ev({ entity: "profiles", data: { full_name: "Priya Raman" } }))).toBe("New member joined: Priya Raman");
    expect(describeEvent(ev({ data: { kind: "question", group_id: P } }))).toBe("New question post in a group");
    expect(describeEvent(ev({ entity: "reactions", data: { kind: "love" } }))).toBe("Reacted Insightful to a post");
    expect(describeEvent(ev({ entity: "messages" }))).toBe("Sent a direct message");
    expect(describeEvent(ev({ action: "delete", entity: "comments" }))).toBe("Deleted a comment");
    expect(describeEvent(ev({ action: "update", entity: "connections", data: { changed: { status: { from: "pending", to: "accepted" } }, row: {} } }))).toBe("Accepted a connection request");
    expect(describeEvent(ev({ action: "update", entity: "profiles", data: { changed: { status: { from: "active", to: "suspended" } }, row: {} } }))).toBe("Member suspended");
    expect(describeEvent(ev({ action: "update", entity: "posts", data: { changed: { pinned_at: { from: null, to: "x" } }, row: {} } }))).toBe("Pinned a post");
    expect(describeEvent(ev({ source: "cms", action: "member.delete", data: { name: "Bob" } }))).toBe("Admin action: member delete Bob");
  });
  it("links each change to its CMS page", () => {
    expect(eventHref(ev({ data: { id: P } }))).toBe(`/cms/posts/${P}`);
    expect(eventHref(ev({ entity: "comments", data: { post_id: P } }))).toBe(`/cms/posts/${P}`);
    expect(eventHref(ev({ entity: "profiles", data: { id: A } }))).toBe(`/cms/members/${A}`);
    expect(eventHref(ev({ action: "delete", data: { id: P } }))).toBeNull();
    expect(eventHref(ev({ entity: "messages" }))).toBe("/cms/messages");
  });
  it("finds the member a change is about", () => {
    expect(eventPerson(ev({ actor_id: A }))).toBe(A);
    expect(eventPerson(ev({ data: { author_id: A } }))).toBe(A);
    expect(eventPerson(ev({ entity: "profiles", data: { id: A } }))).toBe(A);
    expect(eventPerson(ev({ data: { id: P } }))).toBeNull();
  });
});

describe("CMS subdomain routing", () => {
  it("serves the CMS at the root of cms.smbhub.ca", () => {
    expect(cmsRewrite("cms.smbhub.ca", "/")).toBe("/cms");
    expect(cmsRewrite("cms.smbhub.ca", "/members")).toBe("/cms/members");
    expect(cmsRewrite("CMS.smbhub.ca:443", "/posts/abc")).toBe("/cms/posts/abc");
  });
  it("leaves /cms links, shared paths and files alone", () => {
    expect(cmsRewrite("cms.smbhub.ca", "/cms/members")).toBeNull();
    expect(cmsRewrite("cms.smbhub.ca", "/api/auth/send-email")).toBeNull();
    expect(cmsRewrite("cms.smbhub.ca", "/auth/confirm")).toBeNull();
    expect(cmsRewrite("cms.smbhub.ca", "/brand/smb-hub-logo.png")).toBeNull();
    expect(cmsRewrite("cms.smbhub.ca", "/robots.txt")).toBeNull();
  });
  it("does nothing on the hub's own domain", () => {
    expect(cmsRewrite("smbhub.ca", "/members")).toBeNull();
    expect(cmsRewrite("main.d392wpwuo9j5er.amplifyapp.com", "/")).toBeNull();
    expect(cmsRewrite(null, "/")).toBeNull();
  });
});
