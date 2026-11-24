import { describe, expect, it } from "vitest";
import { linkHref, shortLink, splitLinks, suggestTags } from "@/lib/zip/post-text";

// Update 10: short links and hashtag suggestions, checked against the hand-off's examples
describe("short links", () => {
  it("shows the domain plus the start of the path", () => {
    expect(shortLink("https://www.yealink.com/en/product-list/video-conferencing?utm_source=x")).toBe("yealink.com/en/product-list/vi…");
    expect(shortLink("www.canadiansme.ca")).toBe("canadiansme.ca");
    expect(shortLink("https://smehub.ca/help")).toBe("smehub.ca/help");
  });
  it("opens the full address with tracking removed, https only for www links", () => {
    expect(linkHref("https://shop.ca/a?utm_source=news&id=4&fbclid=1")).toBe("https://shop.ca/a?id=4");
    expect(linkHref("www.shop.ca/a")).toBe("https://www.shop.ca/a");
    expect(linkHref("javascript:alert(1)")).toBe("");
  });
  it("keeps closing punctuation outside the link", () => {
    const p = splitLinks("See https://shop.ca/a. Thanks (www.b.ca)!");
    expect(p.map((x) => x.text)).toEqual(["See ", "https://shop.ca/a", ". Thanks (", "www.b.ca", ")!"]);
    expect(p[1].href).toBe("https://shop.ca/a");
    expect(p[3].href).toBe("https://www.b.ca/");
  });
});

describe("hashtag suggestions", () => {
  it("suggests from keywords, the community's hashtags and strong words, at most 6, never ones already used", () => {
    const s = suggestTags("We now sell video conferencing headsets for remote teams across Ontario. #tech", ["headsets", "remotework"]);
    expect(s.length).toBeLessThanOrEqual(6);
    expect(s).toContain("videoconferencing");
    expect(s).toContain("remotework");
    expect(s).not.toContain("tech");
    expect(s.at(-1) === "smallbusiness" || s.length === 6).toBe(true);
  });
  it("needs a few words first, and follows the team's rules", () => {
    expect(suggestTags("hello", [])).toEqual([]);
    expect(suggestTags("Our bakery opened a second shop in Toronto this month", [], (t) => t !== "food")).not.toContain("food");
  });
});
