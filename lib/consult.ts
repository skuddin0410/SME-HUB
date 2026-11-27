/** Update 36: free consultations. Open times, labels and calendar invites (used by the server and the page). */
import { icsText, icsZ, zonedToUtc } from "@/lib/events";

export type ConsultHours = Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { am: boolean; pm: boolean }>;
export type ConsultRules = { len: number; gap: number; max_day: number; ahead: number; notice: number; hours: ConsultHours; tz: string; q_biz: boolean; q_topic: boolean; q_web: boolean };
export type ConsultPublic = ({ open: true; taken: [string, number][]; held: string[] } & ConsultRules) | { open: false };

export const CONSULT_DAYS: [keyof ConsultHours, string][] = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
/** The two blocks of each day, in the Advisor's time zone: [label from, label to, minute from, minute to]. */
export const CONSULT_BLOCKS = { am: ["9:00 am", "12:00 pm", 540, 720], pm: ["1:00 pm", "5:00 pm", 780, 1020] } as const;
export const DEFAULT_HOURS: ConsultHours = {
  mon: { am: true, pm: false }, tue: { am: true, pm: true }, wed: { am: false, pm: false }, thu: { am: false, pm: true },
  fri: { am: true, pm: false }, sat: { am: false, pm: false }, sun: { am: false, pm: false },
};
export const DEFAULT_CONSULT = { len: 30, gap: 15, max_day: 3, ahead: 30, notice: 12, hours: DEFAULT_HOURS, q_biz: true, q_topic: true, q_web: false, reg_mail: "each" as "each" | "daily", gcal: false };

const TZ = "America/Toronto";
const KEYS: (keyof ConsultHours)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "9:00 am" from minutes after midnight. */
export const minLabel = (m: number) => `${(Math.floor(m / 60) % 12) || 12}:${pad(m % 60)} ${m >= 720 ? "pm" : "am"}`;

/** Today's date in Toronto, as y-m-d numbers. */
function torontoParts(t: number) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute };
}
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const torontoDayKey = (t: number) => { const p = torontoParts(t); return dayKey(p.y, p.m, p.d); };

export type Slot = { at: string; m: number };

/**
 * Open times per day ("2026-11-30" → slots), worked out the way the database checks them:
 * the Advisor's blocks split by call length + gap, not sooner than the notice, not past the booking window,
 * not touching a booking (gap included) or a time someone else is holding, not clashing with a busy time,
 * and no more than "most calls a day".
 */
export function openTimes(r: ConsultRules, taken: [string, number][], held: string[], busy: [number, number][], now = Date.now()): Map<string, Slot[]> {
  const out = new Map<string, Slot[]>();
  const tk = taken.map(([a, mins]) => [Date.parse(a), mins] as [number, number]);
  const hold = new Set(held.map((h) => Date.parse(h)));
  const min = now + r.notice * 3600_000;
  const max = now + r.ahead * 86400_000;
  const t0 = torontoParts(now);
  const perDay = new Map<string, number>();
  for (const [a] of tk) { const k = torontoDayKey(a); perDay.set(k, (perDay.get(k) ?? 0) + 1); }
  for (let i = 0; i <= r.ahead + 1; i++) {
    const base = new Date(Date.UTC(t0.y, t0.m - 1, t0.d + i, 12));
    const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate();
    const key = dayKey(y, m, d);
    if (r.max_day > 0 && (perDay.get(key) ?? 0) >= r.max_day) continue;
    const h = r.hours[KEYS[base.getUTCDay()]];
    const slots: Slot[] = [];
    for (const b of ["am", "pm"] as const) {
      if (!h?.[b]) continue;
      const [, , from, to] = CONSULT_BLOCKS[b];
      for (let t = from; t + r.len <= to; t += r.len + r.gap) {
        const at = zonedToUtc(key, `${pad(Math.floor(t / 60))}:${pad(t % 60)}`, "ET").getTime();
        if (at < min || at > max || hold.has(at)) continue;
        if (tk.some(([s, mins]) => s < at + (r.len + r.gap) * 60000 && s + (mins + r.gap) * 60000 > at)) continue;
        if (busy.some(([s, e]) => s < at + r.len * 60000 && e > at)) continue;
        slots.push({ at: new Date(at).toISOString(), m: t });
      }
    }
    if (slots.length) out.set(key, slots);
  }
  return out;
}

/** "Mon, Nov 30" for a day key. */
export function dayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).replace(/\./g, "");
}
/** "Mon, Nov 30 · 9:00 am ET" for an instant. */
export function callWhen(iso: string) {
  const t = Date.parse(iso);
  const p = torontoParts(t);
  return `${dayLabel(dayKey(p.y, p.m, p.d))} · ${minLabel(p.min)} ET`;
}
/** "Mon, Nov 30 · 9:00 am to 9:30 am ET" */
export function callSpan(iso: string, minutes: number) {
  const p = torontoParts(Date.parse(iso));
  return `${dayLabel(dayKey(p.y, p.m, p.d))} · ${minLabel(p.min)} to ${minLabel(p.min + minutes)} ET`;
}

/**
 * The calendar invite (Update 36): a stable UID per booking, SEQUENCE + 1 on every move, METHOD:CANCEL when cancelled.
 * Each person's copy carries only their own link: the member's join link; never the host's start link.
 */
export function consultIcs(o: {
  id: string; seq: number; start: string; minutes: number; cancelled?: boolean; site: string;
  summary: string; description: string; location: string;
  organizer: { name: string; email: string }; attendees: { name: string; email: string }[];
}) {
  const s = new Date(o.start);
  const e = new Date(s.getTime() + o.minutes * 60000);
  const host = o.site.replace(/^https?:\/\//, "");
  const cn = (n: string) => n.replace(/[";:,\\]/g, " ").trim() || "SME Hub member";
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SME Hub//Consultations//EN", "CALSCALE:GREGORIAN", `METHOD:${o.cancelled ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT", `UID:call-${o.id}@${host}`, `SEQUENCE:${o.seq}`, `DTSTAMP:${icsZ(new Date())}`, `DTSTART:${icsZ(s)}`, `DTEND:${icsZ(e)}`,
    `SUMMARY:${icsText(o.summary)}`, `DESCRIPTION:${icsText(o.description)}`, `LOCATION:${icsText(o.location)}`,
    `ORGANIZER;CN=${cn(o.organizer.name)}:mailto:${o.organizer.email}`,
    ...o.attendees.map((a) => `ATTENDEE;CN=${cn(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${a.email}`),
    `STATUS:${o.cancelled ? "CANCELLED" : "CONFIRMED"}`,
  ];
  if (!o.cancelled) for (const t of ["-P1D", "-PT1H"]) L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Free consultation", `TRIGGER:${t}`, "END:VALARM");
  L.push("END:VEVENT", "END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}
