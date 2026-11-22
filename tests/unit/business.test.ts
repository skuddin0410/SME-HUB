import { describe, expect, it } from "vitest";
import { clock, dayLine, money, parseHours, websiteUrl } from "@/lib/business";

describe("business helpers", () => {
  it("shows 24-hour times the Canadian way", () => {
    expect(clock("09:00")).toBe("9:00 AM");
    expect(clock("12:30")).toBe("12:30 PM");
    expect(clock("00:15")).toBe("12:15 AM");
    expect(clock("17:00")).toBe("5:00 PM");
  });

  it("describes a day's hours, or Closed", () => {
    expect(dayLine({ mon: [["09:00", "17:00"]] }, "mon")).toBe("9:00 AM to 5:00 PM");
    expect(dayLine({ mon: [["09:00", "12:00"], ["13:00", "17:00"]] }, "mon")).toBe("9:00 AM to 12:00 PM, 1:00 PM to 5:00 PM");
    expect(dayLine({ mon: [] }, "mon")).toBe("Closed");
    expect(dayLine({}, "sun")).toBe("Closed");
  });

  it("reads the hours form and treats a half-filled day as closed", () => {
    const form = new FormData();
    form.set("mon_open", "09:00");
    form.set("mon_close", "17:00");
    form.set("tue_open", "09:00");
    const hours = parseHours(form);
    expect(hours.mon).toEqual([["09:00", "17:00"]]);
    expect(hours.tue).toEqual([]);
    expect(hours.sun).toEqual([]);
  });

  it("adds https to a bare website and leaves full links alone", () => {
    expect(websiteUrl("maple.ca")).toBe("https://maple.ca");
    expect(websiteUrl("http://maple.ca")).toBe("http://maple.ca");
    expect(websiteUrl("  ")).toBe("");
  });

  it("formats prices in Canadian dollars", () => {
    expect(money(60)).toMatch(/60\.00/);
    expect(money(null)).toBe("");
  });
});
