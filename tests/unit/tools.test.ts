import { describe, expect, it } from "vitest";
import { gst, loanPay, tlM } from "@/lib/tools/data";

// Update 13 checklist: 1,000 → $1,130.00 in Ontario and 250 → $287.44 in Quebec
describe("GST/HST calculator", () => {
  it("adds Ontario HST", () => expect(tlM(gst("ON", 1000, "add").tot)).toBe("$1,130.00"));
  it("adds GST and QST in Quebec", () => expect(tlM(gst("QC", 250, "add").tot)).toBe("$287.44"));
  it("finds the tax inside a total", () => expect(tlM(gst("ON", 1130, "remove").base)).toBe("$1,000.00"));
});
describe("loan calculator", () => {
  it("monthly payment on $50,000 at 7.5% over 5 years", () => expect(loanPay(50000, 7.5, 5, 12).toFixed(2)).toBe("1001.90"));
});
