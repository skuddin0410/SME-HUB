import QRCode from "qrcode";

/** Update 31: the 4 card styles, the switches, and the card's data. Shared by the card page, the public page and downloads. */
export type CardStyle = "classic" | "midnight" | "maple" | "minimal";
export type CardTheme = { n: string; bg: string; g: string; ink: string; sub: string; acc: string; stripe?: boolean; qrbg: string; logo: string; ring: string };

export const CARD_STYLES: Record<CardStyle, CardTheme> = {
  classic: { n: "Classic", bg: "#FFFFFF", g: "", ink: "#0F172A", sub: "#475569", acc: "#B3241A", stripe: true, qrbg: "#FFFFFF", logo: "/img/bc-logo.png", ring: "#E2E8F0" },
  midnight: { n: "Midnight", bg: "#0F172A", g: "#1E3A5F", ink: "#FFFFFF", sub: "#CBD5E1", acc: "#FCA5A5", qrbg: "#FFFFFF", logo: "/img/bc-logo-dark.png", ring: "rgba(255,255,255,.85)" },
  maple: { n: "Maple", bg: "#B3241A", g: "#7F1D1D", ink: "#FFFFFF", sub: "#FDE2DF", acc: "#FDE68A", qrbg: "#FFFFFF", logo: "/img/bc-logo-dark.png", ring: "rgba(255,255,255,.85)" },
  minimal: { n: "Minimal", bg: "#F4F1EC", g: "", ink: "#111111", sub: "#555555", acc: "#111111", qrbg: "#F4F1EC", logo: "/img/bc-logo.png", ring: "#FFFFFF" },
};
export const cardBg = (t: CardTheme) => (t.g ? `linear-gradient(160deg,${t.bg},${t.g})` : t.bg);

/** The switches, in the design's order: [key, label]. */
export const CARD_FIELDS = [
  ["title", "Title"],
  ["business", "Business"],
  ["city", "City"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["website", "Website"],
] as const;
export type CardField = (typeof CARD_FIELDS)[number][0];

/** What a card shows: only the fields that are switched on are present. */
export type CardData = {
  handle: string;
  name: string;
  avatar?: string | null;
  style: CardStyle;
  title?: string;
  business?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
};

/** The site the card links point to: NEXT_PUBLIC_SITE_URL when set (for example https://test.smehub.ca), else smehub.ca. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://smehub.ca").replace(/^https?:\/\//, "").replace(/\/$/, "");
export const cardLink = (handle: string) => `${SITE}/c/${handle}`;
export const cardUrl = (handle: string, src?: "qr" | "link") => `https://${cardLink(handle)}${src ? `?s=${src}` : ""}`;
export const bizLine = (d: Pick<CardData, "business" | "city">) => [d.business, d.city].filter(Boolean).join(" · ");
export const initials = (n: string) => n.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();

/** The QR modules for the card link (error correction M). The code holds only the link, never a phone or email. */
export function qrModules(handle: string): boolean[][] {
  const q = QRCode.create(cardUrl(handle, "qr"), { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const rows: boolean[][] = [];
  for (let y = 0; y < n; y++) {
    const r: boolean[] = [];
    for (let x = 0; x < n; x++) r.push(!!q.modules.get(y, x));
    rows.push(r);
  }
  return rows;
}

/**
 * The QR as one SVG path. `quiet` is the light border in modules: 4 on its own (the QR pop-up), 2 on the card,
 * where the light square around it adds the rest.
 */
export function qrSvg(handle: string, colour = "#0F172A", quiet = 4): string {
  const m = qrModules(handle);
  const n = m.length;
  const Q = quiet;
  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (m[y][x]) {
        const s = x;
        while (x < n && m[y][x]) x++;
        d += `M${s + Q} ${y + Q}h${x - s}v1h-${x - s}z`;
      } else x++;
    }
  }
  return `<svg viewBox="0 0 ${n + Q * 2} ${n + Q * 2}" shape-rendering="crispEdges" aria-hidden="true"><path fill="${colour}" d="${d}"/></svg>`;
}

/** vCard 3.0 with only the switched-on fields. */
export function vcard(d: CardData): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const parts = d.name.trim().split(/\s+/);
  const v = ["BEGIN:VCARD", "VERSION:3.0", `N:${esc(parts.slice(1).join(" "))};${esc(parts[0] ?? "")};;;`, `FN:${esc(d.name)}`];
  if (d.business) v.push(`ORG:${esc(d.business)}`);
  if (d.title) v.push(`TITLE:${esc(d.title)}`);
  if (d.phone) v.push(`TEL;TYPE=WORK,VOICE:${d.phone.replace(/[^\d+]/g, "")}`);
  if (d.email) v.push(`EMAIL;TYPE=WORK:${d.email}`);
  if (d.website) v.push(`URL:${/^https?:\/\//.test(d.website) ? d.website : `https://${d.website}`}`);
  if (d.city) {
    const [c, p] = d.city.split(",").map((s) => s.trim());
    v.push(`ADR;TYPE=WORK:;;;${esc(c ?? "")};${esc(p ?? "")};;Canada`);
  }
  if (d.avatar) v.push(`PHOTO;VALUE=URI:${d.avatar}`);
  v.push(`NOTE:Saved from SME Hub · https://${cardLink(d.handle)}`, "END:VCARD");
  return v.join("\r\n") + "\r\n";
}

/** The card_public() answer as card data. */
export function fromPublic(j: Record<string, unknown>): CardData & { id: string; searchable: boolean; bizSlug?: string; bizName?: string; bizRating?: number; bizReviews?: number } {
  const s = (k: string) => (typeof j[k] === "string" && j[k] ? (j[k] as string) : undefined);
  return {
    id: String(j.id),
    handle: String(j.handle),
    name: String(j.name ?? "SME Hub member"),
    avatar: s("avatar") ?? null,
    style: (s("style") as CardStyle) in CARD_STYLES ? (s("style") as CardStyle) : "classic",
    searchable: j.searchable === true,
    title: s("title"),
    business: s("business"),
    city: s("city"),
    phone: s("phone"),
    email: s("email"),
    website: s("website"),
    bizSlug: s("biz_slug"),
    bizName: s("biz_name"),
    bizRating: typeof j.biz_rating === "number" ? j.biz_rating : undefined,
    bizReviews: typeof j.biz_reviews === "number" ? j.biz_reviews : undefined,
  };
}
