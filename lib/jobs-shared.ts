/** Update 43: SME Hub Jobs. Types and formatting shared by the server and the browser. */

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Seasonal"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export type Where = "onsite" | "hybrid" | "remote";
export type Per = "hour" | "year" | "project";

export type JobBiz = { id: string; slug: string; name: string; logo: string | null; city: string; prov: string; category: string; about: string };
export type Job = {
  id: string; title: string; type: JobType; where: Where; big: boolean; from: number | null; to: number | null; per: Per;
  desc: string; how: "hub" | "email" | "url"; email: string | null; url: string | null; vacancy: boolean | null; ai: boolean | null;
  featured: boolean; status: "open" | "closed" | "held" | "removed"; closes: string; created: string; views: number;
  biz: JobBiz; refs: number; postedBy: string;
  /** a job from a business page's Jobs tab: opens on the business page */
  fromPage?: boolean; payText?: string;
};

const BCOL = ["#1D4ED8", "#B91C1C", "#047857", "#7C3AED", "#B45309", "#0E7490", "#BE185D", "#4D7C0F"];
export function bizColour(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BCOL[h % BCOL.length];
}
export function bizInitials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").filter(Boolean);
  return ((w[0] ?? "?")[0] + ((w[1] ?? "")[0] ?? "")).toUpperCase();
}

export function payText(j: Pick<Job, "from" | "to" | "per" | "payText">) {
  if (j.payText && !j.from) return j.payText;
  if (!j.from) return "Pay not listed";
  const f = (n: number) => (j.per === "year" ? `$${Math.round(n / 1000)}K` : `$${Number.isInteger(n) ? n : n.toFixed(2)}`);
  const range = j.to && j.to !== j.from ? `${f(j.from)} to ${f(j.to)}` : f(j.from);
  return `${range}${j.per === "hour" ? " an hour" : j.per === "year" ? " a year" : " for the project"}`;
}

export function whereText(j: Pick<Job, "where" | "biz">) {
  if (j.where === "remote") return "Remote";
  const place = [j.biz.city, j.biz.prov].filter(Boolean).join(", ") || "Canada";
  return `${place}${j.where === "hybrid" ? " · Hybrid" : ""}`;
}

export function ageText(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

/** hourly pay, for "Highest pay" (a year is 2,080 hours) */
export function hourly(j: Pick<Job, "from" | "per">) {
  return !j.from ? 0 : j.per === "year" ? j.from / 2080 : j.per === "hour" ? j.from : 0;
}

export const SCAM_JOB = /((training|registration|application|starter[- ]?kit|equipment|onboarding)\s+fees?|pay\s+(for|a)\s+(your\s+)?(training|kit|deposit|starter)|deposit\s+(of|is)\s+\$|send\s+(us\s+)?(your\s+)?bank(ing)?\s+(details|info|information)|e-?\s?transfer|gift\s?cards?|crypto|bitcoin|work from home.{0,30}\$\d{3,}\s*(a|per)\s*day)/i;
