// Update 13: business tools (calculators) built for Canadian rules. Rates reviewed October 2026 (the hand-off's TXR).
// [code, name, GST %, provincial part %, provincial tax name]
export const TXR: [string, string, number, number, string][] = [
  ["AB", "Alberta", 5, 0, ""], ["BC", "British Columbia", 5, 7, "PST"], ["MB", "Manitoba", 5, 7, "RST"], ["NB", "New Brunswick", 5, 10, "HST"],
  ["NL", "Newfoundland and Labrador", 5, 10, "HST"], ["NS", "Nova Scotia", 5, 9, "HST"], ["NT", "Northwest Territories", 5, 0, ""], ["NU", "Nunavut", 5, 0, ""],
  ["ON", "Ontario", 5, 8, "HST"], ["PE", "Prince Edward Island", 5, 10, "HST"], ["QC", "Quebec", 5, 9.975, "QST"], ["SK", "Saskatchewan", 5, 6, "PST"], ["YT", "Yukon", 5, 0, ""],
];
export const txr = (c: string) => TXR.find((t) => t[0] === c) ?? TXR[8];
export const txLabel = (c: string) => { const r = txr(c); return r[4] === "HST" ? `${r[2] + r[3]}% HST` : r[3] ? `5% GST + ${r[3]}% ${r[4]}` : "5% GST"; };

// [id, name, icon, description]
export const TOOLS: [string, string, string, string][] = [
  ["gst", "GST/HST Calculator", "calc", "Provincial and federal rates for every province and territory, including HST provinces."],
  ["payroll", "Payroll Deductions Estimator", "users", "CPP, EI and income tax withheld per pay period, by province."],
  ["cashflow", "Cash-Flow Forecaster", "trend", "Project 13 weeks of money in and out, including remittance dates."],
  ["loan", "Loan Payment Calculator", "bank", "Compare term loan, operating line and equipment financing scenarios."],
  ["selfemployed", "Self-Employed Tax Estimator", "briefcase", "Income tax, both halves of CPP, monthly set-aside and quarterly instalments for sole proprietors."],
  ["import", "Import Landed Cost Calculator", "box", "Exchange, freight, duty and border GST/HST, per unit, with a margin-safe price."],
  ["pricing", "Pricing and Break-Even Calculator", "tag", "Break-even sales, markup vs margin, and the price rise needed when your costs go up."],
];
/** Payroll and self-employed use the full 2026 tax tables on CanadianSME.ca for now, so both sites give the same numbers. */
export const TLX: Record<string, string> = { payroll: "https://canadiansme.ca/tools/payroll/", selfemployed: "https://canadiansme.ca/tools/self-employed/" };

export const tlN = (v: string | number) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : 0; };
export const tlM = (n: number, dp = 2) => { const neg = n < 0; const s = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: dp, maximumFractionDigits: dp }); return `${neg ? "−" : ""}$${s}`; };

/** GST/HST: add tax to a price, or find the tax inside a total. */
export function gst(prov: string, amount: number, mode: "add" | "remove") {
  const r = txr(prov);
  const rate = (r[2] + r[3]) / 100;
  const base = mode === "remove" ? amount / (1 + rate) : amount;
  const tot = mode === "remove" ? amount : amount * (1 + rate);
  const hst = r[4] === "HST";
  return { r, base, tot, gst: hst ? (base * (r[2] + r[3])) / 100 : (base * r[2]) / 100, pv: hst ? 0 : (base * r[3]) / 100 };
}
export const loanPay = (P: number, r: number, y: number, f: number) => { const n = y * f, i = r / 100 / f; return i ? (P * i) / (1 - Math.pow(1 + i, -n)) : n ? P / n : 0; };
