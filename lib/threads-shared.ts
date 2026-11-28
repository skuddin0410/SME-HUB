/** Update 42: things both the server and the browser need for weekly threads and anonymous questions. */

const PROV: [string, string][] = [
  ["ON", "Ontario"], ["QC", "Quebec"], ["BC", "British Columbia"], ["AB", "Alberta"], ["MB", "Manitoba"], ["SK", "Saskatchewan"],
  ["NS", "Nova Scotia"], ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["PE", "Prince Edward Island"],
  ["YT", "Yukon"], ["NT", "Northwest Territories"], ["NU", "Nunavut"],
];

/** "Ontario" from "Toronto, ON" or "Ontario"; "Canada" when it can't tell (the database's province_of does the same). */
export function provinceOf(loc: string | null | undefined) {
  const s = String(loc ?? "").trim();
  const last = (s.split(",").pop() ?? "").trim();
  for (const [code, name] of PROV) {
    if (last.toUpperCase() === code || last.toLowerCase() === name.toLowerCase() || s.toLowerCase() === name.toLowerCase()) return name;
  }
  return "Canada";
}

export type ThreadKey = "mon" | "wed" | "fri";
export const THREAD_DAYS: Record<ThreadKey, { day: string; dow: number }> = {
  mon: { day: "Monday", dow: 1 },
  wed: { day: "Wednesday", dow: 3 },
  fri: { day: "Friday", dow: 5 },
};

/** Day of the week in Toronto (0 = Sunday). */
export function torontoDow(at = new Date()) {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", weekday: "short" }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(d);
}
