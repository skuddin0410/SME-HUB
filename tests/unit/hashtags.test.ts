import { describe, expect, it } from "vitest";
import { canon, extractTags, splitTags, tagOk, type TagRules } from "@/lib/zip/hashtags";

const R: TagRules = { per: 3, min: 3, max: 10, blocked: ["free"], removed: { old: true }, merge: { taxes: "tax" } };

describe("hashtags", () => {
  it("merges a tag into the one it became", () => {
    expect(canon("Taxes", R.merge)).toBe("tax");
    expect(canon("grants", R.merge)).toBe("grants");
  });
  it("applies length, blocked and removed rules", () => {
    expect(tagOk("ab", R)).toBe(false);
    expect(tagOk("abcdefghijk", R)).toBe(false);
    expect(tagOk("free", R)).toBe(false);
    expect(tagOk("old", R)).toBe(false);
    expect(tagOk("grants", R)).toBe(true);
  });
  it("finds distinct tags up to the most allowed in a post", () => {
    expect(extractTags("#Grants #grants #taxes #hiring #retail", R)).toEqual(["grants", "tax", "hiring"]);
    expect(extractTags("no tags here, just a # sign and #1abc", R)).toEqual([]);
  });
  it("cuts text into plain and tag pieces", () => {
    expect(splitTags("Need #grants help, #free stuff", R)).toEqual([
      { text: "Need " }, { text: "#grants", tag: "grants" }, { text: " help, #free stuff" },
    ]);
  });
  it("leaves tags past the limit as plain text", () => {
    const pieces = splitTags("#aaa #bbb #ccc #ddd", R);
    expect(pieces.filter((p) => p.tag).map((p) => p.tag)).toEqual(["aaa", "bbb", "ccc"]);
  });
});
