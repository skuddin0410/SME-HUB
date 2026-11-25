/** AI matchmaking: the questions, choices and wording from the handoff. */
export const MMQ = ["Your goal", "What you need", "Who to meet", "When you are free", "Check and match"];
export const GOALS: [string, string][] = [["customers", "Find customers"], ["advice", "Get expert advice"], ["supplier", "Find a supplier or partner"], ["peers", "Meet owners like me"]];
export const MMGI: Record<string, [string, string, string]> = {
  customers: ["coin", "More customers", "Meet owners who need what you sell."],
  advice: ["help", "Expert advice", "Talk to an advisor or a peer who has done it."],
  supplier: ["building", "A supplier or partner", "Find someone to buy from or refer work with."],
  peers: ["users", "Owners like me", "Swap notes with people at your stage."],
};
export const NEEDS = ["Bookkeeping", "Lease advice", "Online marketing", "Wholesale", "Customs", "Inventory reports", "Solar installs", "Packaging suppliers"];
export const AVAIL: [string, string][] = [["Weekday mornings", "9 am to 12 pm"], ["Weekday afternoons", "12 pm to 5 pm"], ["Evenings", "5 pm to 8 pm"]];

export type Prefs = { goal: string; needs: string[]; where: "near" | "any"; avail: string[]; format: "one" | "group" };
export const DEFAULT_PREFS: Prefs = { goal: "advice", needs: [], where: "any", avail: ["Weekday mornings"], format: "one" };
export type Match = { id: string; name: string; avatar: string | null; role: string; city: string; plan: string; score: number; why: string[]; both: string[] };

// two call times for each part of the day, as [hour, minute]
const TIMES: Record<string, [number, number][]> = { "Weekday mornings": [[10, 0], [9, 30]], "Weekday afternoons": [[14, 0], [13, 30]], Evenings: [[19, 0], [18, 30]] };

function weekdaysAfter(day: Date, n: number): Date[] {
  const out: Date[] = [];
  let d = day;
  while (out.length < n) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d);
  }
  return out;
}

/** The next weekday call times (Toronto time) for the parts of the day both people are free, as "Tue, Dec 1 · 10:00 am ET". */
export function slotsFor(parts: string[], now = new Date()): string[] {
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const days = weekdaysAfter(today, 3);
  const out: string[] = [];
  for (const part of parts.length ? parts : ["Weekday afternoons"]) {
    const times = TIMES[part] ?? TIMES["Weekday afternoons"];
    [[days[0], times[0]], [days[2], times[1]]].forEach(([d, t]) => {
      const day = d as Date;
      const [h, m] = t as [number, number];
      out.push(`${day.toLocaleDateString("en-US", { weekday: "short" })}, ${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"} ET`);
    });
  }
  return out.slice(0, 3);
}

/** "December round": a round is a calendar month. */
export function roundInfo(now = new Date()) {
  const t = new Date(now.toLocaleString("en-US", { timeZone: "America/Toronto" }));
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  const next = new Date(t.getFullYear(), t.getMonth() + 1, 1);
  const f = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { name: t.toLocaleDateString("en-US", { month: "long" }), closes: f(last), opens: f(next) };
}
