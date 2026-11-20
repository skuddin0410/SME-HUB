import { describe, expect, it } from "vitest";
import { signalScore, topSignal } from "@/lib/feed";

const post = (id: string, counts: Record<string, number>, comments = 0, pinned = false) => ({ id, counts, comments, pinned_at: pinned ? "2026-01-01" : null });

describe("signalScore", () => {
  it("counts reactions once and replies twice", () => expect(signalScore(post("a", { like: 2, love: 1 }, 3))).toBe(9));
  it("is zero for a quiet post", () => expect(signalScore(post("a", {}))).toBe(0));
});

describe("topSignal", () => {
  it("puts the most useful first", () => {
    expect(topSignal([post("a", { like: 1 }), post("b", { celebrate: 5 }), post("c", {}, 1)]).map((p) => p.id)).toEqual(["b", "c", "a"]);
  });
  it("keeps pinned posts on top whatever their score", () => {
    expect(topSignal([post("a", { like: 9 }), post("p", {}, 0, true)]).map((p) => p.id)).toEqual(["p", "a"]);
  });
  it("keeps the original (newest first) order for ties", () => {
    expect(topSignal([post("new", {}), post("old", {})]).map((p) => p.id)).toEqual(["new", "old"]);
  });
  it("does not change the input", () => {
    const list = [post("a", {}), post("b", { like: 1 })];
    topSignal(list);
    expect(list.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
