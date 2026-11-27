/**
 * Update 31: draws the business card for the downloads, in the browser.
 * - Save image: a 1080 x 1512 PNG (the 300 x 420 card at 3.6x).
 * - Print-ready PDF: 2 pages of 3.75 x 2.25 in (a 3.5 x 2 in card plus a 1/8 in bleed), with TrimBox and BleedBox
 *   set for the printer. Front: logo, name, title, business and details. Back: the code (1 in wide) and the link.
 */
import { CARD_STYLES, bizLine, cardLink, initials, qrModules, type CardData, type CardTheme } from "@/lib/business-card";

type Assets = { logo: HTMLImageElement | null; photo: HTMLImageElement | null };

function img(src: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });
}
async function ready(t: CardTheme, d: CardData): Promise<Assets> {
  const fonts = ['800 24px "Plus Jakarta Sans"', "600 13px Inter", "500 12px Inter", "800 9px Inter"].map((f) => document.fonts?.load(f).catch(() => undefined));
  const [logo, photo] = await Promise.all([img(t.logo), img(d.avatar), ...fonts]);
  return { logo: logo as HTMLImageElement | null, photo: photo as HTMLImageElement | null };
}
// the page's own fonts (next/font names them differently), falling back to the system font
const DISPLAY = () => getComputedStyle(document.documentElement).getPropertyValue("--display").trim() || '"Plus Jakarta Sans", sans-serif';
const BODY = () => getComputedStyle(document.documentElement).getPropertyValue("--body").trim() || "Inter, sans-serif";

function fill(c: CanvasRenderingContext2D, t: CardTheme, x: number, y: number, w: number, h: number) {
  if (t.g) {
    const g = c.createLinearGradient(x, y, x + w * 0.34, y + h);
    g.addColorStop(0, t.bg);
    g.addColorStop(1, t.g);
    c.fillStyle = g;
  } else c.fillStyle = t.bg;
  c.fillRect(x, y, w, h);
}
function qr(c: CanvasRenderingContext2D, handle: string, x: number, y: number, size: number) {
  const m = qrModules(handle);
  const n = m.length;
  const u = size / n;
  c.fillStyle = "#0F172A";
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (m[r][k]) c.fillRect(x + k * u, y + r * u, Math.ceil(u), Math.ceil(u));
}
function round(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function photo(c: CanvasRenderingContext2D, a: Assets, d: CardData, t: CardTheme, cx: number, cy: number, r: number, font: string) {
  c.save();
  c.beginPath();
  c.arc(cx, cy, r + 3, 0, Math.PI * 2);
  c.fillStyle = t.ring;
  c.fill();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();
  if (a.photo) {
    const s = Math.min(a.photo.width, a.photo.height);
    c.drawImage(a.photo, (a.photo.width - s) / 2, (a.photo.height - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
  } else {
    c.fillStyle = t.acc === "#111111" ? "#111111" : "#B3241A";
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.fillStyle = "#fff";
    c.font = `800 ${Math.round(r * 0.7)}px ${font}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(initials(d.name), cx, cy + 1);
    c.textBaseline = "alphabetic";
  }
  c.restore();
}
function wrap(c: CanvasRenderingContext2D, txt: string, max: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of txt.split(" ")) {
    const t = cur ? `${cur} ${w}` : w;
    if (c.measureText(t).width > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
function spaced(c: CanvasRenderingContext2D, txt: string, x: number, y: number, sp: number, align: CanvasTextAlign) {
  const ctx = c as CanvasRenderingContext2D & { letterSpacing?: string };
  c.textAlign = align;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${sp}px`;
  c.fillText(txt, x, y);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}
/** A name that fits one line: shrink down to 16px. */
function fit(c: CanvasRenderingContext2D, txt: string, size: number, max: number, font: string) {
  let s = size;
  c.font = `800 ${s}px ${font}`;
  while (s > 16 && c.measureText(txt).width > max) {
    s -= 1;
    c.font = `800 ${s}px ${font}`;
  }
}

function portrait(c: CanvasRenderingContext2D, s: number, t: CardTheme, a: Assets, d: CardData) {
  const D = DISPLAY();
  const B = BODY();
  c.save();
  c.scale(s, s);
  fill(c, t, 0, 0, 300, 420);
  if (t.stripe) {
    c.fillStyle = t.acc;
    c.fillRect(0, 0, 300, 5);
  }
  if (a.logo) c.drawImage(a.logo, 16, 16, 70, (70 * a.logo.height) / a.logo.width);
  c.fillStyle = t.acc;
  c.font = `800 9px ${B}`;
  spaced(c, "MEMBER", 284, 29, 1.5, "right");
  photo(c, a, d, t, 150, 84, 34, D);
  let y = 150;
  c.textAlign = "center";
  c.fillStyle = t.ink;
  fit(c, d.name, 24, 268, D);
  c.fillText(d.name, 150, y);
  y += 21;
  if (d.title) {
    c.fillStyle = t.sub;
    c.font = `500 13px ${B}`;
    c.fillText(d.title, 150, y);
    y += 19;
  }
  const bl = bizLine(d);
  if (bl) {
    c.fillStyle = t.ink;
    c.font = `600 13px ${B}`;
    for (const l of wrap(c, bl, 262)) {
      c.fillText(l, 150, y);
      y += 17;
    }
    y += 2;
  }
  c.fillStyle = t.sub;
  c.font = `500 12px ${B}`;
  for (const v of [d.phone, d.email, d.website?.replace(/^https?:\/\//, "")]) {
    if (v) {
      c.fillText(v, 150, y);
      y += 17;
    }
  }
  c.fillStyle = t.qrbg;
  round(c, 98, 284, 104, 104, 8);
  c.fill();
  qr(c, d.handle, 105, 291, 90);
  c.fillStyle = t.sub;
  c.font = `500 10.5px ${B}`;
  c.textAlign = "center";
  c.fillText(cardLink(d.handle), 150, 405);
  c.restore();
}

/** Print front, 375 x 225 units (bleed 12.5) */
function front(c: CanvasRenderingContext2D, s: number, t: CardTheme, a: Assets, d: CardData) {
  const D = DISPLAY();
  const Bf = BODY();
  const B = 12.5;
  const M = B + 16;
  c.save();
  c.scale(s, s);
  fill(c, t, 0, 0, 375, 225);
  if (t.stripe) {
    c.fillStyle = t.acc;
    c.fillRect(0, 0, 375, B + 5);
  }
  if (a.logo) c.drawImage(a.logo, M, M + 2, 62, (62 * a.logo.height) / a.logo.width);
  c.fillStyle = t.acc;
  c.font = `800 8px ${Bf}`;
  spaced(c, "MEMBER", 375 - M, M + 12, 1.4, "right");
  photo(c, a, d, t, 375 - M - 34, 118, 32, D);
  let y = 88;
  c.textAlign = "left";
  c.fillStyle = t.ink;
  fit(c, d.name, 21, 230, D);
  c.fillText(d.name, M, y);
  y += 17;
  if (d.title) {
    c.fillStyle = t.sub;
    c.font = `500 11px ${Bf}`;
    c.fillText(d.title, M, y);
    y += 16;
  }
  const bl = bizLine(d);
  if (bl) {
    c.fillStyle = t.ink;
    c.font = `600 11px ${Bf}`;
    for (const l of wrap(c, bl, 220)) {
      c.fillText(l, M, y);
      y += 14;
    }
  }
  const det = [d.phone, d.email, d.website?.replace(/^https?:\/\//, "")].filter(Boolean) as string[];
  let yy = 225 - M - (det.length - 1) * 14;
  c.fillStyle = t.sub;
  c.font = `500 10px ${Bf}`;
  for (const v of det) {
    c.fillText(v, M, yy);
    yy += 14;
  }
  c.restore();
}
function back(c: CanvasRenderingContext2D, s: number, t: CardTheme, d: CardData) {
  const Bf = BODY();
  const B = 12.5;
  c.save();
  c.scale(s, s);
  fill(c, t, 0, 0, 375, 225);
  if (t.stripe) {
    c.fillStyle = t.acc;
    c.fillRect(0, 225 - B - 5, 375, B + 5);
  }
  c.fillStyle = t.qrbg;
  round(c, 130, 40, 115, 115, 8);
  c.fill();
  qr(c, d.handle, 137.5, 47.5, 100); // 100 units of 375 across 3.75 in = 1 in wide
  c.textAlign = "center";
  c.fillStyle = t.ink;
  c.font = `700 11px ${Bf}`;
  c.fillText("Scan to save my contact", 187.5, 174);
  c.fillStyle = t.sub;
  c.font = `500 9.5px ${Bf}`;
  c.fillText(cardLink(d.handle), 187.5, 189);
  c.restore();
}

function canvas(w: number, h: number) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return cv;
}
function jpeg(cv: HTMLCanvasElement): Uint8Array {
  const bin = atob(cv.toDataURL("image/jpeg", 0.95).split(",")[1]);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}
/** A small PDF writer: one full-bleed JPEG per page, with TrimBox and BleedBox for the printer. */
function pdf(pages: { w: number; h: number; bytes: Uint8Array }[], wPt: number, hPt: number, bleed: number): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const xo: number[] = [];
  let off = 0;
  const add = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    parts.push(b);
    off += b.length;
  };
  const n = pages.length;
  const total = 2 + n * 3;
  add("%PDF-1.4\n%âãÏÓ\n");
  const obj = (id: number, body: string) => {
    xo[id] = off;
    add(`${id} 0 obj\n${body}\nendobj\n`);
  };
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${n} >>`);
  pages.forEach((p, i) => {
    const pg = 3 + i * 3;
    const ct = pg + 1;
    const im = pg + 2;
    const cs = `q ${wPt} 0 0 ${hPt} 0 0 cm /Im0 Do Q`;
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wPt} ${hPt}] /BleedBox [0 0 ${wPt} ${hPt}] /TrimBox [${bleed} ${bleed} ${wPt - bleed} ${hPt - bleed}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
    obj(ct, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    xo[im] = off;
    add(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`);
    add(p.bytes);
    add("\nendstream\nendobj\n");
  });
  const xs = off;
  let x = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let j = 1; j <= total; j++) x += `${`0000000000${xo[j]}`.slice(-10)} 00000 n \n`;
  add(`${x}trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xs}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export async function cardPng(d: CardData): Promise<Blob> {
  const t = CARD_STYLES[d.style];
  const a = await ready(t, d);
  const cv = canvas(1080, 1512);
  portrait(cv.getContext("2d")!, 3.6, t, a, d);
  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("no image"))), "image/png"));
}

export async function cardPdf(d: CardData): Promise<Blob> {
  const t = CARD_STYLES[d.style];
  const a = await ready(t, d);
  const W = 1125;
  const H = 675;
  const f = canvas(W, H);
  const b = canvas(W, H);
  front(f.getContext("2d")!, 3, t, a, d);
  back(b.getContext("2d")!, 3, t, d);
  return pdf([{ w: W, h: H, bytes: jpeg(f) }, { w: W, h: H, bytes: jpeg(b) }], 270, 162, 9);
}
