// Update 4: Courses. The shapes the pages work with and the rules they show (who can open what, progress,
// what comes next). The same rules are enforced in the database (supabase/migrations/0048_courses.sql);
// these copies only decide what to show. Ported from the hand-off's code/courses-source/cr1-3.js.

export const CTOPICS = ["Cash flow & finance", "Marketing", "Hiring & people", "AI for small business", "Exporting"] as const;
export const CLEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const CLANGS = ["English", "French"] as const;
export type LessonType = "video" | "text" | "assignment" | "quiz";
export const CTYPES: Record<LessonType, [string, string]> = { video: ["Video", "play"], text: ["Reading", "doc"], assignment: ["Assignment", "asg"], quiz: ["Quiz", "quiz"] };
export const CTZS: [string, string][] = [
  ["America/Toronto", "Eastern Time"], ["America/Halifax", "Atlantic Time"], ["America/St_Johns", "Newfoundland Time"],
  ["America/Winnipeg", "Central Time"], ["America/Edmonton", "Mountain Time"], ["America/Vancouver", "Pacific Time"],
];
export const TOPIC_ICON: Record<string, string> = { "Cash flow & finance": "coin", Marketing: "spark", "Hiring & people": "users", "AI for small business": "spark", Exporting: "send" };
export const DAY = 864e5;
export const MAX_SUBMISSION = 10485760;

export type Person = { id: string; name: string; role: string; avatar: string | null };
export type Res = { id: string; name: string; size: number };
export type Asg = { brief: string; dueDays: number; time: string; tz: string; marks: number; pass: number; sub: "both" | "file" | "text"; rubric: string[] };
export type QuizInfo = { pass: number; limit: number; attempts: number; n: number };
export type Lesson = {
  id: string; title: string; type: LessonType; mins: number; free: boolean; drip: number; res: Res[];
  asg?: Asg; quiz?: QuizInfo;
};
export type Section = { id: string; title: string; lessons: Lesson[] };
export type Course = {
  id: string; slug: string; title: string; topic: string; level: string; lang: string; access: "free" | "paid"; price: number;
  cover: string; instructors: Person[]; status: "draft" | "published"; sample: boolean; created: number;
  summary: string; desc: string[]; suits: string[]; outcomes: string[]; prereq: string[]; materials: string[];
  rules: { order: "seq" | "any"; asg: "submit" | "pass" }; sections: Section[];
  pvideo: boolean; pvtt: boolean; pposter: string; group: { id: string; slug: string; name: string } | null;
  askPub: number | null; canEdit: boolean;
};
export type Review = { id: string; by: Person; stars: number; text: string; t: number; mine: boolean };
export type Sub = { id: string; t: number; text: string; file: { name: string; size: number } | null; late: boolean; grade: { marks: number; fb: string; by: string; t: number } | null; seen: boolean };
export type Enrol = { t: number; lastT: number | null; last: string | null; completed: number | null; paid: boolean; done: Record<string, number>; pos: Record<string, number>; passed: Record<string, true>; subs: Record<string, Sub> };

export const lessonsOf = (c: Course) => c.sections.flatMap((s) => s.lessons);
export const lessonById = (c: Course, id: string) => lessonsOf(c).find((l) => l.id === id) ?? null;
export const courseMins = (c: Course) => lessonsOf(c).reduce((n, l) => n + (+l.mins || 0), 0);
export function dur(m: number) {
  m = +m || 0;
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`;
}
export const names = (c: Course) => c.instructors.map((i) => i.name).join(" and ");
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Is the lesson complete for this learner (videos/readings marked, quizzes passed, assignments by the course rule). */
export function lessonDone(c: Course, l: Lesson, e: Enrol | null) {
  if (!e) return false;
  if (l.type === "quiz") return !!e.passed[l.id];
  if (l.type === "assignment") {
    const s = e.subs[l.id];
    if (!s) return false;
    return c.rules.asg === "pass" ? !!(s.grade && l.asg && s.grade.marks >= l.asg.pass) : true;
  }
  return !!e.done[l.id];
}

export type Access = { ok: boolean; staff?: boolean; prev?: boolean; why?: "enrol" | "drip" | "order"; at?: number; need?: Lesson };
/** Who can open the lesson, and if not, why (the same order of checks the database uses). */
export function access(c: Course, l: Lesson, e: Enrol | null, staff: boolean, now = Date.now()): Access {
  if (staff) return { ok: true, staff: true };
  if (!e) return l.free ? { ok: true, prev: true } : { ok: false, why: "enrol" };
  if (l.drip) {
    const op = e.t + l.drip * DAY;
    if (now < op) return { ok: false, why: "drip", at: op };
  }
  if (c.rules.order === "seq") {
    for (const x of lessonsOf(c)) {
      if (x.id === l.id) break;
      if (!lessonDone(c, x, e)) return { ok: false, why: "order", need: x };
    }
  }
  return { ok: true };
}
export function progress(c: Course, e: Enrol | null) {
  const a = lessonsOf(c);
  const d = a.filter((l) => lessonDone(c, l, e)).length;
  return { done: d, total: a.length, pct: a.length ? Math.round((100 * d) / a.length) : 0 };
}
export const complete = (c: Course, e: Enrol | null) => {
  const p = progress(c, e);
  return p.total > 0 && p.done === p.total;
};
/** Where "Continue learning" goes: the last lesson if unfinished, else the next unfinished one that's open. */
export function nextLesson(c: Course, e: Enrol | null, staff: boolean): Lesson | null {
  const a = lessonsOf(c);
  if (!e) return a[0] ?? null;
  if (e.last) {
    const L = lessonById(c, e.last);
    if (L && !lessonDone(c, L, e) && access(c, L, e, staff).ok) return L;
    const ix = L ? a.indexOf(L) : -1;
    for (let i = ix + 1; i < a.length; i++) if (!lessonDone(c, a[i], e) && access(c, a[i], e, staff).ok) return a[i];
  }
  for (const l of a) if (!lessonDone(c, l, e) && access(c, l, e, staff).ok) return l;
  for (const l of a) if (!lessonDone(c, l, e)) return l;
  return null;
}
export function nextAfter(c: Course, l: Lesson, e: Enrol | null, staff: boolean) {
  const a = lessonsOf(c);
  for (let j = a.indexOf(l) + 1; j < a.length; j++) if (!lessonDone(c, a[j], e) && access(c, a[j], e, staff).ok) return a[j];
  return null;
}
export type CState = "guest" | "none" | "enrolled" | "started" | "done";
export function courseState(c: Course, e: Enrol | null, member: boolean): CState {
  if (!member) return "guest";
  if (!e) return "none";
  if (complete(c, e)) return "done";
  const p = progress(c, e);
  return p.done || e.last ? "started" : "enrolled";
}
export const learnHref = (c: Course, l: Lesson) => `/courses/${c.slug}/learn/${l.id}`;
export const courseHref = (c: Course) => `/courses/${c.slug}`;

export function rating(rv: Review[]) {
  if (!rv.length) return null;
  return { avg: Math.round((10 * rv.reduce((n, x) => n + x.stars, 0)) / rv.length) / 10, n: rv.length };
}

export function fmtD(t: number, tz?: string | null, opt?: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined, ...(opt ?? { weekday: "short", month: "short", day: "numeric", year: "numeric" }) }).format(new Date(t));
  } catch {
    return new Date(t).toDateString();
  }
}
export const tzName = (tz: string) => CTZS.find((z) => z[0] === tz)?.[1] ?? tz;

/** Deadline = the enrolment day + N days, at the set time, in the set time zone. */
export function dueAt(l: Lesson, e: Enrol | null): number | null {
  if (!e || !l.asg) return null;
  const A = l.asg;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: A.tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(e.t));
  const [y, mo, d] = day.split("-").map(Number);
  const [hh, mm] = A.time.split(":").map(Number);
  // the wall-clock time in that zone, turned into an instant
  const guess = Date.UTC(y, mo - 1, d + A.dueDays, hh, mm);
  const off = tzOffset(A.tz, guess);
  return guess - off;
}
function tzOffset(tz: string, t: number) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(t));
  const g = (k: string) => +(p.find((x) => x.type === k)?.value ?? 0);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - t;
}
export function dueText(l: Lesson, e: Enrol | null) {
  const A = l.asg!;
  const tm = A.time === "23:59" ? "11:59 pm" : A.time;
  const d = dueAt(l, e);
  if (!d) return `Due ${A.dueDays} days after you enrol, at ${tm} ${tzName(A.tz)}`;
  return `${fmtD(d, A.tz)} at ${tm} ${tzName(A.tz)}`;
}

export function ago(t: number, now = Date.now()) {
  const m = Math.round((now - t) / 6e4);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
export const clock = (s: number) => `${Math.floor(s / 60)}:${`0${Math.floor(s) % 60}`.slice(-2)}`;
export function size(b: number) {
  b = +b || 0;
  return b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

/** The publish checklist: [passed, label, optional]. */
export type CheckItem = [boolean, string, boolean?];
export type EdLesson = Lesson & { body: string[]; video: string; vtt: string; poster: string; qs: { q: string; o: string[]; a: number }[] };
export function publishCheck(c: Course, ls: EdLesson[]): CheckItem[] {
  const o: CheckItem[] = [
    [!!c.title.trim(), "Course title"],
    [!!c.summary.trim(), "Short summary"],
    [!!c.cover, "Cover image"],
    [c.instructors.length > 0, "At least one instructor"],
    [ls.length > 0, "At least one lesson"],
    [ls.some((l) => l.free), "One free preview lesson (recommended)", true],
    [ls.every((l) => l.title.trim() && (l.type !== "video" || (l.video && l.vtt)) && (l.type !== "quiz" || (l.qs.length && l.qs.every((q) => q.q.trim() && q.o.every((x) => x.trim())))) && (l.type !== "assignment" || l.asg?.brief.trim())), "Every lesson has a title and its content"],
  ];
  if (c.access === "paid") o.push([+c.price > 0, "A price for the paid course"]);
  return o;
}

export function slugify(t: string) {
  return (t || "course").toLowerCase().replace(/[’']/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "course";
}

// ---------- tax for a paid course (the buyer's province) ----------
// GST/HST only. Provincial sales taxes (PST, QST, RST) on online courses need CanadianSME's accountant to confirm.
export const PROVINCES: Record<string, [string, number, string]> = {
  AB: ["Alberta", 5, "GST"], BC: ["British Columbia", 5, "GST"], MB: ["Manitoba", 5, "GST"], NB: ["New Brunswick", 15, "HST"],
  NL: ["Newfoundland and Labrador", 15, "HST"], NS: ["Nova Scotia", 14, "HST"], NT: ["Northwest Territories", 5, "GST"], NU: ["Nunavut", 5, "GST"],
  ON: ["Ontario", 13, "HST"], PE: ["Prince Edward Island", 15, "HST"], QC: ["Quebec", 5, "GST"], SK: ["Saskatchewan", 5, "GST"], YT: ["Yukon", 5, "GST"],
};
export function provinceOf(location: string | null | undefined) {
  const p = (location ?? "").split(",").pop()?.trim().toUpperCase() ?? "";
  return PROVINCES[p] ? p : null;
}
export function courseTax(priceDollars: number, prov: string) {
  const [name, pct, kind] = PROVINCES[prov] ?? PROVINCES.ON;
  const cents = Math.round(priceDollars * 100);
  const tax = Math.round((cents * pct) / 100);
  return { cents, tax, total: cents + tax, label: `${kind} (${pct}%, ${name})` };
}
export const cad = (cents: number) => `CAD $${(cents / 100).toFixed(2)}`;
