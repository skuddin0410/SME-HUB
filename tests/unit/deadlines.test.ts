import { describe, expect, it } from "vitest";
import { bizDay, dIso, dlDefault, dlGen } from "@/lib/deadlines";

const at = (s: string) => new Date(`${s}T00:00:00Z`);
describe("My deadlines (Update 13)", () => {
  it("moves weekend and public-holiday dates to the next business day", () => {
    expect(dIso(bizDay(at("2026-11-14")))).toBe("2026-11-16"); // Saturday → Monday
    expect(dIso(bizDay(at("2026-12-25")))).toBe("2026-12-28"); // Christmas Friday, Boxing Day Saturday → Monday
    expect(dIso(bizDay(at("2027-07-01")))).toBe("2027-07-02"); // Canada Day
  });
  it("monthly payroll is due the 15th of the next month", () => {
    const L = dlGen({ ...dlDefault("ON"), gst: "none", pay: "regular" }, [], "2026-11-25").filter((x) => x.cat === "pay" && x.t === "Payroll remittance");
    expect(L[0].iso).toBe("2026-12-15");
    expect(L.length).toBe(12);
  });
  it("quarterly GST/HST is due one month after each quarter; T4 by the end of February", () => {
    const L = dlGen({ ...dlDefault("ON"), fye: "11", gst: "quarter", pay: "regular" }, [], "2026-11-25");
    expect(L.find((x) => x.t === "GST/HST return and payment")?.iso).toBe("2027-01-01".replace("01-01", "02-01")); // Dec 31 quarter → Jan 31 (Sunday) → Feb 1
    expect(L.find((x) => x.t === "T4 slips and summary")?.iso).toBe("2027-03-01"); // Feb 28 2027 is a Sunday
  });
  it("sole proprietors with a December year end, annual filers: pay April 30, file June 15", () => {
    const L = dlGen({ ...dlDefault("BC"), gst: "annual", pay: "none" }, [], "2026-11-25");
    expect(L.find((x) => x.t === "Pay GST owing for 2026")?.iso).toBe("2027-04-30");
    expect(L.find((x) => x.t === "File GST return for 2026")?.iso).toBe("2027-06-15");
  });
  it("repeats the member's own deadlines", () => {
    const L = dlGen(null, [{ id: "a", title: "Licence renewal", due: "2026-12-10", rep: "quarter", note: "" }], "2026-11-25");
    expect(L.map((x) => x.iso)).toEqual(["2026-12-10", "2027-03-10", "2027-06-10", "2027-09-10"]);
  });
});
