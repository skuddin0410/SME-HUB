import { vi } from "vitest";
import { describe, expect, it } from "vitest";
import { directoryCategory, domainOf, draftFromAnswers, logoInitials, missLine, nameFromDomain, readyCount, roleParts, type ReadyItems } from "@/lib/ready-shared";
import { assertPublicUrl } from "@/lib/ready-reader";

vi.mock("server-only", () => ({}));

const items = (n: number): ReadyItems => ({ photo: n > 0, headline: n > 1, city: n > 2, helps: n > 3, biz: n > 4 });

describe("profile completion: the five items", () => {
  it("counts how many are done", () => {
    expect(readyCount(items(0))).toBe(0);
    expect(readyCount(items(3))).toBe(3);
    expect(readyCount(items(5))).toBe(5);
  });
  it("splits a headline into role and business", () => {
    expect(roleParts("Owner, Morgan Home Renovations")).toEqual(["Owner", "Morgan Home Renovations"]);
    expect(roleParts("Co-founder, Harbour, Analytics")).toEqual(["Co-founder", "Harbour, Analytics"]);
    expect(roleParts("")).toEqual(["", ""]);
  });
});

describe("the yellow line only uses real numbers", () => {
  const plain = "Ready profiles show up in member search, the Directory and daily “People to meet”.";
  it("falls back to the plain sentence under 2", () => {
    expect(missLine(items(2), { views: 1, searches: 1 }, { city: "Toronto, ON" })[0]).toBe(plain);
    expect(missLine(items(2), { views: 0, searches: 0 }, { city: "" })).toEqual([plain, ""]);
  });
  it("names the directory searches when the business page is missing", () => {
    const [a, b] = missLine(items(4), { views: 9, searches: 5 }, { city: "Brampton, ON" });
    expect(a).toBe("5 owners near Brampton searched the Business Directory for what you do this week.");
    expect(b).toBe("Your business isn’t listed, so they didn’t find you.");
  });
  it("uses the views when the photo or headline is missing and no searches count", () => {
    expect(missLine(items(0), { views: 3, searches: 0 }, { city: "" })[1]).toBe("Without a photo and headline, most leave without connecting.");
    expect(missLine({ ...items(5), photo: false }, { views: 4, searches: 0 }, { city: "" })[0]).toBe("4 members looked at your profile this week.");
  });
});

describe("the draft from three answers", () => {
  it("writes the profile and business page from the answers", () => {
    const d = draftFromAnswers({ firstName: "Alex", title: "Owner", biz: "Morgan Home Renovations", city: "Mississauga, ON", helps: "renovation quotes, hiring" });
    expect(d.cat).toBe("Construction and trades");
    expect(d.helps).toEqual(["Renovation quotes", "Hiring"]);
    expect(d.about).toBe("I’m Alex, owner of Morgan Home Renovations in Mississauga. Morgan Home Renovations renovates homes and small commercial spaces. Ask me about renovation quotes and hiring.");
    expect(d.src).toBe("questions");
  });
  it("keeps at most 5 tags and falls back to suggested ones", () => {
    expect(draftFromAnswers({ firstName: "A", biz: "X", helps: "a,b,c,d,e,f,g" }).helps).toHaveLength(5);
    expect(draftFromAnswers({ firstName: "A", biz: "Clearwater Bookkeeping" }).helps).toEqual(["Bookkeeping", "Cash-flow planning", "HST filing"]);
  });
  it("names the business from the website when none is given", () => {
    expect(domainOf("https://www.morganreno.ca/about?x=1")).toBe("morganreno.ca");
    expect(nameFromDomain("morganreno.ca")).toBe("Morganreno");
    expect(logoInitials("Morgan Home Renovations")).toBe("MH");
  });
  it("maps the draft's label to a category on the real list", () => {
    const list = ["Construction & Trades", "Food & Drink", "Other"];
    expect(directoryCategory("Construction and trades", list)).toBe("Construction & Trades");
    expect(directoryCategory("Food and drink", list)).toBe("Food & Drink");
    expect(directoryCategory("Cleaning services", list)).toBe("Other");
    expect(directoryCategory("Cleaning services", ["Food & Drink"])).toBe("");
  });
});

describe("the website reader refuses private addresses", () => {
  it.each(["http://localhost/", "http://127.0.0.1/", "http://10.0.0.5/admin", "http://192.168.1.1", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://user:pw@example.com/", "ftp://example.com", "http://example.com:8080/", "http://intranet.internal/", "not a url at all"])("%s", async (u) => {
    await expect(assertPublicUrl(u)).rejects.toThrow();
  });
});
