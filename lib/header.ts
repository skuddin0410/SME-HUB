/** Update 39: the 8 ready-made header colours (name, start, end) and how a header is drawn. Shared by server and browser. */
export const HEADER_COLOURS: readonly (readonly [string, string, string])[] = [
  ["SME red", "#B3241A", "#5B0F0A"],
  ["Maple", "#DC2626", "#F59E0B"],
  ["Navy", "#1E3A8A", "#0B1229"],
  ["Forest", "#166534", "#052E16"],
  ["Lake", "#0E7490", "#1E3A8A"],
  ["Plum", "#6B21A8", "#2E0A4A"],
  ["Charcoal", "#3F3F46", "#09090B"],
  ["Sand", "#D6C7A1", "#8C7A52"],
];

/** A colour header as a 1584 x 396 picture: the gradient with three soft circles, as in the design. */
export function headerColourSrc(i: number): string {
  const c = HEADER_COLOURS[i] ?? HEADER_COLOURS[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1584" height="396" viewBox="0 0 1584 396" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient></defs><rect width="1584" height="396" fill="url(#g)"/><circle cx="1330" cy="-40" r="260" fill="#fff" fill-opacity=".07"/><circle cx="1470" cy="330" r="190" fill="#fff" fill-opacity=".05"/><circle cx="160" cy="420" r="230" fill="#000" fill-opacity=".08"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type HeaderCrop = { x: number; y: number; z: number };
export type MemberHeader = { header_url?: string | null; header_src?: string | null; header_crop?: HeaderCrop | null; header_colour?: number | null };

/** The picture to show for a member's header, or null for the standard one. */
export function headerSrc(h: MemberHeader | null | undefined): string | null {
  if (!h) return null;
  if (h.header_url) return h.header_url;
  if (h.header_colour != null) return headerColourSrc(h.header_colour);
  return null;
}
