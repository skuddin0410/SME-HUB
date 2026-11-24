/** Update 15: Grant Finder (shared by server and browser). */
export type GrantType = "grant" | "loan" | "tax" | "wage" | "train";
export type Grant = {
  id: string; name: string; by_org: string; type: GrantType; amount: string; use_for: string; prov: string;
  deadline: string; checked: string; fit: string; who: string[]; how: string[]; url: string | null;
};
export type GrantSave = { program_id: string; stage: Stage; ready: Record<string, boolean> };
export type Stage = "Saved" | "Preparing" | "Submitted" | "Approved";
export type AiLeft = { plus: boolean; questions: number; drafts: number; qmax: number; dmax: number };

export const STAGES: Stage[] = ["Saved", "Preparing", "Submitted", "Approved"];
export const GRANT_FIELDS = "id, name, by_org, type, amount, use_for, prov, deadline, checked, fit, who, how, url";

/** [label, tag colour class] as in the zip (GFT). */
export const GFT: Record<GrantType, [string, string]> = { grant: ["Grant", "offer"], loan: ["Loan", "question"], tax: ["Tax credit", "hiring"], wage: ["Wage subsidy", "win"], train: ["Training grant", "offer"] };
export const TYPE_OPTS: [string, string][] = [["all", "All types"], ["grant", "Grants"], ["loan", "Loans"], ["tax", "Tax credits"], ["wage", "Wage subsidies"], ["train", "Training grants"]];

export const PROV_NAMES: Record<string, string> = {
  CA: "Federal", AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia",
  NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon",
};

export const READY_ITEMS = [
  "I meet every rule under “Who can apply”",
  "My business is registered and my CRA business number is ready",
  "I have my last 2 years of financial statements",
  "I have quotes or a budget for what I want to pay for",
  "I can explain how this helps my business grow",
];

export const ASK_CHIPS = ["Do I qualify?", "What can I spend it on?", "What do I need to apply?"];

/** The Government of Canada's own finder, for when results are few. */
export const BENEFITS_FINDER = "https://innovation.ised-isde.canada.ca/innovation/s/?language=en_CA";

export const kindOf = (t: GrantType) =>
  t === "loan" ? "loan" : t === "tax" ? "tax" : t === "wage" ? "wage" : "grant";

/** Programs for a province: federal ones plus that province's. */
export const matchesFor = (all: Grant[], prov: string | null) => all.filter((p) => p.prov === "CA" || (prov && p.prov === prov));

export function filterGrants(all: Grant[], q: string, prov: string, type: string) {
  const s = q.toLowerCase().trim();
  return all
    .filter((p) => (prov === "all" || p.prov === "CA" || p.prov === prov) && (type === "all" || p.type === type) && (!s || `${p.name} ${p.by_org} ${p.use_for}`.toLowerCase().includes(s)))
    .sort((a, b) => (b.checked ? 1 : 0) - (a.checked ? 1 : 0));
}

/** A province code from a profile location such as "Toronto, ON". */
export const provFromLocation = (loc: string | null | undefined) => {
  const m = /,\s*([A-Z]{2})\s*$/.exec(loc ?? "");
  return m && PROV_NAMES[m[1]] && m[1] !== "CA" ? m[1] : null;
};
