/** Updates 35 and 37: Events. Shared by the Events pages, the server actions and the calendar file. */
export const EV_TYPES = ["Webinar", "Workshop", "Networking", "Live Q&A", "Conference"] as const;
export const EV_TOPICS = ["Money and tax", "Marketing", "Selling and export", "Hiring and people", "Tech and AI", "Made in Canada", "Community"] as const;
export const EV_PROV: Record<string, string> = {
  ON: "Ontario", QC: "Quebec", BC: "British Columbia", AB: "Alberta", MB: "Manitoba", SK: "Saskatchewan", NS: "Nova Scotia", NB: "New Brunswick", NL: "Newfoundland and Labrador", PE: "Prince Edward Island",
};
export const EV_IMGS = ["laptop", "awning", "bars", "nodes", "bakery", "ship"] as const;
/** The event's own time zone; real zones, so daylight saving time is right. */
export const EV_TZ: Record<string, [string, string]> = {
  PT: ["America/Vancouver", "Pacific (PT)"],
  MT: ["America/Edmonton", "Mountain (MT)"],
  CT: ["America/Winnipeg", "Central (CT)"],
  ET: ["America/Toronto", "Eastern (ET)"],
  AT: ["America/Halifax", "Atlantic (AT)"],
};

export type Ev = {
  id: string;
  slug: string;
  title: string;
  description: string;
  host_kind: "hub" | "csme" | "member";
  host_id: string | null;
  type: string;
  topic: string;
  fmt: "online" | "inperson";
  starts_at: string | null;
  ends_at: string | null;
  tz: string;
  city: string;
  prov: string;
  venue: string;
  price: number | null;
  cap: number | null;
  img: string;
  series: string;
  agenda: string[];
  flagship: boolean;
  cancelled_at: string | null;
  /** Update 45: "no", "yes" (for people who registered) or "promo" (clips may promote future events). Missing before migration 0080. */
  recording?: "no" | "yes" | "promo";
};
export const EV_SELECT = "id, slug, title, description, host_kind, host_id, type, topic, fmt, starts_at, ends_at, tz, city, prov, venue, price, cap, img, series, agenda, flagship, cancelled_at";
export type EvHost = { name: string; sub: string; id: string | null; avatar: string | null; role?: string; city?: string };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The parts of a moment as seen in the event's time zone. */
export function evParts(iso: string, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: EV_TZ[tz]?.[0] ?? "America/Toronto", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false, weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, dow: DAY.indexOf(String(p.weekday).slice(0, 3)) };
}
const clock = (h: number, mi: number) => `${h % 12 || 12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;

export function evWhen(e: Pick<Ev, "starts_at" | "ends_at" | "tz">, long = false) {
  if (!e.starts_at) return "Date to be announced";
  const p = evParts(e.starts_at, e.tz);
  const end = e.ends_at ? evParts(e.ends_at, e.tz) : null;
  return `${DAY[p.dow]}, ${MON[p.mo - 1]} ${p.d}${long ? `, ${p.y}` : ""} · ${clock(p.h, p.mi)}${end ? `–${clock(end.h, end.mi)}` : ""} ${e.tz}`;
}
export function evWhere(e: Pick<Ev, "fmt" | "city" | "prov">) {
  if (e.fmt === "online") return "Online";
  return e.city ? `${e.city}, ${e.prov}` : "In person, location to be announced";
}
export function evDateBlock(e: Pick<Ev, "starts_at" | "tz">) {
  if (!e.starts_at) return null;
  const p = evParts(e.starts_at, e.tz);
  return { mon: MON[p.mo - 1], d: p.d, dow: DAY[p.dow] };
}
export function evMonthKey(e: Pick<Ev, "starts_at" | "tz">) {
  if (!e.starts_at) return "Dates to be announced";
  const p = evParts(e.starts_at, e.tz);
  return `${MONL[p.mo - 1]} ${p.y}`;
}
export const evPrice = (e: Pick<Ev, "price">) => (e.price === null ? "Price to be announced" : e.price ? `$${e.price} + HST` : "Free");

/** A local date and time in an event's time zone, as a UTC instant (for the host form). */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const zone = EV_TZ[tz]?.[0] ?? "America/Toronto";
  const guess = new Date(`${date}T${time}:00Z`);
  // what the zone shows for that instant, and the difference from what we wanted
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(guess);
  const g = Object.fromEntries(p.map((x) => [x.type, x.value]));
  const shown = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour % 24, +g.minute);
  return new Date(guess.getTime() - (shown - guess.getTime()));
}

export function evHostOf(e: Pick<Ev, "host_kind" | "host_id">, m?: { full_name?: string | null; avatar_url?: string | null; headline?: string | null; location?: string | null; plan?: string | null; profile_type?: string | null } | null): EvHost {
  if (e.host_kind === "hub") return { name: "SME Hub team", sub: "SME Hub", id: null, avatar: null };
  if (e.host_kind === "csme") return { name: "CanadianSME", sub: "Organizer", id: null, avatar: null };
  const advisor = m?.plan === "advisor" || m?.profile_type === "advisor";
  return { name: m?.full_name || "SME Hub member", sub: advisor ? "SME Advisor" : m?.headline ?? "", id: e.host_id, avatar: m?.avatar_url ?? null, role: m?.headline ?? "", city: m?.location ?? "" };
}

// ---------- calendars ----------
export const icsZ = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const z = icsZ;
export const icsText = (t: string) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export function evLocation(e: Ev) {
  return e.fmt === "online" ? "Online (link on SME Hub)" : `${e.venue ? `${e.venue}, ` : ""}${evWhere(e)}`;
}
export function evCalLinks(e: Ev, site: string) {
  if (!e.starts_at) return null;
  const s = new Date(e.starts_at);
  const en = e.ends_at ? new Date(e.ends_at) : new Date(s.getTime() + 3600_000);
  const det = `${e.description}\n\nEvent page: ${site}/events/${e.slug}`;
  const loc = evLocation(e);
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${z(s)}/${z(en)}&details=${encodeURIComponent(det)}&location=${encodeURIComponent(loc)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&subject=${encodeURIComponent(e.title)}&startdt=${encodeURIComponent(s.toISOString())}&enddt=${encodeURIComponent(en.toISOString())}&body=${encodeURIComponent(det)}&location=${encodeURIComponent(loc)}`,
  };
}
/** One event as a calendar file, with an alarm for each reminder the member chose. The same UID every time, so updates replace it. */
export function evIcs(e: Ev, site: string, rem: { week: boolean; day: boolean; hour: boolean }, link?: string | null) {
  const s = new Date(e.starts_at!);
  const en = e.ends_at ? new Date(e.ends_at) : new Date(s.getTime() + 3600_000);
  const host = site.replace(/^https?:\/\//, "");
  const L = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SME Hub//Events//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${e.id}@${host}`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(s)}`, `DTEND:${z(en)}`, `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(`${e.description}${link ? `\n\nJoin: ${link}` : ""}\n\nEvent page: ${site}/events/${e.slug}`)}`,
    `LOCATION:${icsText(link && e.fmt === "online" ? link : evLocation(e))}`, `URL:${site}/events/${e.slug}`,
    ...(e.cancelled_at ? ["STATUS:CANCELLED"] : []),
  ];
  for (const [on, t] of [[rem.week, "-P7D"], [rem.day, "-P1D"], [rem.hour, "-PT1H"]] as const) {
    if (on) L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, `TRIGGER:${t}`, "END:VALARM");
  }
  L.push("END:VEVENT", "END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}
