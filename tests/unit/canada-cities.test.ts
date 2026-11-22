import { describe, expect, it } from "vitest";
import { placeFor } from "@/lib/canada-cities";

describe("placeFor", () => {
  it("finds a city ignoring accents and case", () => {
    expect(placeFor("Montréal, QC")).toEqual(placeFor("montreal, qc"));
    expect(placeFor("Toronto, ON")).toEqual([-79.38, 43.65]);
  });
  it("falls back to the province for a small town", () => {
    expect(placeFor("Tiny Town, MB")).toEqual([-98.3, 54.5]);
  });
  it("gives nothing for a place it cannot read", () => {
    expect(placeFor("Somewhere")).toBeNull();
    expect(placeFor("")).toBeNull();
  });
});
