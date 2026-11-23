/** "November 24, 2026, 3:05 PM ET": security emails show when something happened, in Eastern time. */
export function whenET(date: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h12" })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const period = String(parts.dayPeriod ?? "").replace(/\./g, "").toUpperCase();
  return `${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} ${period} ET`;
}

export const NOT_KNOWN = "Not available";

/** A readable device name from a User-Agent string, such as "Chrome on Windows". */
export function deviceFromUserAgent(ua: string | null | undefined) {
  if (!ua) return NOT_KNOWN;
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || NOT_KNOWN;
}

/** An IP address with its last two parts hidden, as the handoff asks for security emails. */
export function maskIp(ip: string | null | undefined) {
  if (!ip) return NOT_KNOWN;
  const first = ip.split(",")[0]!.trim();
  if (first.includes(":")) return `${first.split(":").slice(0, 2).join(":")}:••••`;
  const p = first.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.•••.•••` : NOT_KNOWN;
}
