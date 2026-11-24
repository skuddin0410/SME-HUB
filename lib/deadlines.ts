// Update 13: My deadlines. Turns a member's answers into CRA dates for the next 12 months (the hand-off's dlGen),
// following the CRA's general rules (canada.ca, November 2026). A date on a weekend or a public holiday moves to the
// next business day. Used by the page and by the daily reminder job, so both always agree.
import { txr } from "@/lib/tools/data";

export type DlSetup = { prov: string; type: "sole" | "corp"; fye: string; gst: "none" | "annual" | "quarter" | "month"; gstInst: boolean; pay: "none" | "regular" | "quarterly"; taxInst: boolean; corpInst: boolean };
export type DlCustom = { id: string; title: string; due: string; rep: "none" | "month" | "quarter" | "year"; note: string };
export type DlRem = { email: boolean; bell: boolean; d14: boolean; d7: boolean; d1: boolean; weekly: boolean };
export type DlItem = { key: string; iso: string; moved: boolean; t: string; dt: string; cat: "tax" | "pay" | "inc" | "own"; own?: string };

export const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DLCAT: Record<DlItem["cat"], [string, string]> = { tax: ["Sales tax", "question"], pay: ["Payroll", "hiring"], inc: ["Income tax", "win"], own: ["My own", "intro"] };
export const DEFAULT_REM: DlRem = { email: true, bell: true, d14: false, d7: true, d1: true, weekly: true };
export const dlDefault = (prov = "ON"): DlSetup => ({ prov, type: "sole", fye: "11", gst: "quarter", gstInst: false, pay: "regular", taxInst: false, corpInst: false });

const pad = (n: number) => String(n).padStart(2, "0");
export const dIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const mEnd = (y: number, m: number) => D(y, m + 1, 0);
const nthWeekday = (y: number, m: number, wd: number, n: number) => { const first = D(y, m, 1); return D(y, m, 1 + ((wd - first.getUTCDay() + 7) % 7) + (n - 1) * 7); };
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return D(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}
/** Public holidays the CRA observes for due dates. */
function holidays(y: number): Set<string> {
  const e = easter(y);
  const vic = D(y, 4, 24); vic.setUTCDate(24 - ((vic.getUTCDay() + 6) % 7)); // Monday before May 25
  const list = [D(y, 0, 1), D(y, e.getUTCMonth(), e.getUTCDate() - 2), D(y, e.getUTCMonth(), e.getUTCDate() + 1), vic, D(y, 6, 1), nthWeekday(y, 7, 1, 1),
    nthWeekday(y, 8, 1, 1), D(y, 8, 30), nthWeekday(y, 9, 1, 2), D(y, 10, 11), D(y, 11, 25), D(y, 11, 26)];
  return new Set(list.map(dIso));
}
/** The next business day: not a Saturday, Sunday or public holiday. */
export function bizDay(d: Date) {
  const x = new Date(d);
  for (let i = 0; i < 10; i++) {
    const w = x.getUTCDay();
    if (w !== 0 && w !== 6 && !holidays(x.getUTCFullYear()).has(dIso(x))) break;
    x.setUTCDate(x.getUTCDate() + 1);
  }
  return x;
}
const fmt = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Every deadline in the 12 months from `today` (YYYY-MM-DD). */
export function dlGen(s: DlSetup | null, custom: DlCustom[], today: string): DlItem[] {
  const t0 = new Date(`${today}T00:00:00Z`), t1 = new Date(t0); t1.setUTCFullYear(t1.getUTCFullYear() + 1);
  const out: DlItem[] = [];
  const add = (d: Date, t: string, dt: string, cat: DlItem["cat"]) => {
    const bd = bizDay(d);
    if (bd < t0 || bd > t1) return;
    out.push({ key: `${cat}|${dIso(bd)}|${t}`, iso: dIso(bd), moved: dIso(bd) !== dIso(d), t, dt, cat });
  };
  if (s) {
    const Y = t0.getUTCFullYear(), fm = Number(s.fye) || 0, r = txr(s.prov), tx = r[4] === "HST" ? "GST/HST" : "GST", where = s.prov === "QC" ? "Revenu Québec" : "CRA";
    for (let y = Y - 1; y <= Y + 1; y++) {
      if (s.gst === "month") for (let m = 0; m < 12; m++) add(mEnd(y, m + 1), `${tx} return and payment`, `${MON[m]} ${y} period. Due one month after the period ends. File with ${where}.`, "tax");
      if (s.gst === "quarter") for (let q = 0; q < 4; q++) { const qm = fm - 3 * q; add(mEnd(y, qm + 1), `${tx} return and payment`, `Quarter ending ${fmt(mEnd(y, qm))}. Due one month after the quarter ends. File with ${where}.`, "tax"); }
      if (s.gst === "annual") {
        if (s.type === "sole" && fm === 11) {
          add(D(y + 1, 3, 30), `Pay ${tx} owing for ${y}`, "Annual filer with a December 31 year end: payment is due April 30.", "tax");
          add(D(y + 1, 5, 15), `File ${tx} return for ${y}`, "Annual filer with a December 31 year end: the return is due June 15.", "tax");
        } else add(mEnd(y, fm + 3), `File and pay annual ${tx} return`, `Fiscal year ending ${fmt(mEnd(y, fm))}. Due three months after year end.`, "tax");
        if (s.gstInst) for (let k = 1; k <= 4; k++) add(mEnd(y, fm + 3 * k - 12 + 1), `${tx} instalment`, "Annual filers who owe $3,000 or more pay instalments one month after each fiscal quarter.", "tax");
      }
      if (s.pay === "regular") for (let m = 0; m < 12; m++) add(D(y, m, 15), "Payroll remittance", `Source deductions (CPP, EI, income tax) from ${MON[(m + 11) % 12]} pay. Due the 15th of the next month.`, "pay");
      if (s.pay === "quarterly") [0, 3, 6, 9].forEach((m) => add(D(y, m, 15), "Payroll remittance (quarterly)", "Deductions for the previous calendar quarter.", "pay"));
      if (s.pay !== "none") add(D(y, 2, 0), "T4 slips and summary", `Give T4 slips to employees and file the T4 summary for ${y - 1}.`, "pay");
      if (s.type === "sole") {
        add(D(y, 3, 30), "Pay personal income tax balance", `${y - 1} tax owing is due April 30, even though self-employed people can file later.`, "inc");
        add(D(y, 5, 15), "File personal tax return (self-employed)", `Return for ${y - 1} is due June 15 for self-employed people and their spouses.`, "inc");
        if (s.taxInst) [[2, 15], [5, 15], [8, 15], [11, 15]].forEach(([m, d]) => add(D(y, m, d), "Income tax instalment", "Quarterly instalment if you owed more than $3,000 last year.", "inc"));
      }
      if (s.type === "corp") {
        add(mEnd(y, fm + 2), "Pay corporate tax balance", `For the year ending ${fmt(mEnd(y, fm))}. Two months after year end (three months for many small Canadian-controlled private corporations).`, "inc");
        add(mEnd(y, fm + 6), "File T2 corporate tax return", `For the year ending ${fmt(mEnd(y, fm))}. Due six months after year end.`, "inc");
        if (s.corpInst) for (let j = 1; j <= 4; j++) add(mEnd(y, fm + 3 * j - 12), "Corporate tax instalment", "Quarterly instalment for eligible small Canadian-controlled private corporations: last day of each quarter.", "inc");
      }
    }
  }
  for (const c of custom) {
    const d = new Date(`${c.due}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const step = ({ month: 1, quarter: 3, year: 12 } as Record<string, number>)[c.rep] ?? 0;
    for (let i = 0; i < (step ? Math.ceil(12 / step) + 1 : 1); i++) {
      const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + i * step);
      if (x >= t0 && x <= t1) out.push({ key: `own|${c.id}|${dIso(x)}`, iso: dIso(x), moved: false, t: c.title, dt: c.note, cat: "own", own: c.id });
    }
  }
  const seen = new Set<string>();
  return out.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true))).sort((a, b) => a.iso.localeCompare(b.iso));
}

export const daysUntil = (iso: string, today: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
export const dlWhen = (iso: string, today: string) => { const n = daysUntil(iso, today); return n === 0 ? "Today" : n === 1 ? "Tomorrow" : n < 0 ? `${Math.abs(n)} days ago` : `In ${n} days`; };
export const dLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
export const torontoToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });

/** Tidies what the browser sent before it is saved. */
export function cleanSetup(x: Partial<DlSetup>): DlSetup {
  const pick = <T extends string>(v: unknown, ok: readonly T[], def: T) => (ok.includes(v as T) ? (v as T) : def);
  return {
    prov: pick(x.prov, ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"], "ON"),
    type: pick(x.type, ["sole", "corp"], "sole"),
    fye: String(Math.min(11, Math.max(0, Number(x.fye) || 0))),
    gst: pick(x.gst, ["none", "annual", "quarter", "month"], "quarter"),
    gstInst: !!x.gstInst, pay: pick(x.pay, ["none", "regular", "quarterly"], "regular"), taxInst: !!x.taxInst, corpInst: !!x.corpInst,
  };
}
