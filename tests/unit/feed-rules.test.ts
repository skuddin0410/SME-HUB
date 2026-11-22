import { describe, expect, it } from "vitest";
import { canEdit, cleanPollOptions, pollShares } from "@/lib/feed-rules";
import { REACTION_KINDS, REACTION_LABEL } from "@/lib/reactions";

describe("edit window", () => {
  const now = Date.parse("2026-11-22T10:00:00Z");
  it("allows edits for ten minutes", () => {
    expect(canEdit("2026-11-22T09:50:30Z", now)).toBe(true);
    expect(canEdit("2026-11-22T09:49:00Z", now)).toBe(false);
  });
});

describe("poll options", () => {
  it("trims and drops blanks", () => expect(cleanPollOptions([" Red ", "", "Blue"])).toEqual(["Red", "Blue"]));
  it("needs at least two", () => expect(cleanPollOptions(["Only"])).toBeNull());
  it("allows at most ten", () => expect(cleanPollOptions(Array.from({ length: 11 }, (_, i) => `o${i}`))).toBeNull());
  it("caps each option at 80 characters", () => expect(cleanPollOptions(["a", "b".repeat(81)])).toBeNull());
});

describe("poll shares", () => {
  it("is all zero with no votes", () => expect(pollShares([0, 0, 0])).toEqual([0, 0, 0]));
  it("always adds up to 100", () => {
    for (const v of [[1, 1, 1], [3, 3, 1], [7, 2], [1, 0, 0]]) expect(pollShares(v).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe("reactions", () => {
  it("has six kinds, each with a label", () => {
    expect(REACTION_KINDS).toHaveLength(6);
    for (const k of REACTION_KINDS) expect(REACTION_LABEL[k]).toBeTruthy();
  });
});
