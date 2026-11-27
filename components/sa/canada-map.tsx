"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_CITIES, MAP_DOTS } from "@/lib/canada-map";

/**
 * Log-in page background: a grey dot map of Canada, laid flat and seen at an angle along the bottom of the page.
 * Cities have pins and names, and introductions arc between them. After a successful log-in (the "sa:welcome"
 * event) rings pulse from the member's city. Decorative only: hidden from screen readers, no pointer events,
 * paused when the tab is hidden, drawn once and kept still when the visitor asks for reduced motion.
 */
const Y0 = 440;
const Y1 = 800;
const NAMES: Record<string, string> = {
  "vancouver|BC": "Vancouver",
  "calgary|AB": "Calgary",
  "edmonton|AB": "Edmonton",
  "winnipeg|MB": "Winnipeg",
  "toronto|ON": "Toronto",
  "ottawa|ON": "Ottawa",
  "montreal|QC": "Montreal",
  "halifax|NS": "Halifax",
};
/** Where each name sits beside its pin so that names never overlap: x offset, y offset, alignment. */
const LABEL: Record<string, [number, number, "l" | "c" | "r"]> = {
  "vancouver|BC": [-8, 4, "r"],
  "calgary|AB": [0, 8, "c"],
  "edmonton|AB": [0, -24, "c"],
  "winnipeg|MB": [0, 8, "c"],
  "toronto|ON": [-10, -4, "r"],
  "ottawa|ON": [-10, -24, "r"],
  "montreal|QC": [10, -2, "l"],
  "halifax|NS": [0, 8, "c"],
};
const BIG = new Set(["toronto|ON", "montreal|QC", "vancouver|BC", "calgary|AB", "ottawa|ON", "edmonton|AB"]);
const ARCS: [string, string][] = [
  ["vancouver|BC", "toronto|ON"],
  ["calgary|AB", "montreal|QC"],
  ["toronto|ON", "halifax|NS"],
  ["edmonton|AB", "winnipeg|MB"],
  ["ottawa|ON", "vancouver|BC"],
  ["regina|SK", "quebec city|QC"],
];
/** The main city of each province or territory, for placing a member who gave only a province. */
const PROVINCE_CITY: Record<string, string> = {
  ON: "toronto|ON", QC: "montreal|QC", BC: "vancouver|BC", AB: "calgary|AB", MB: "winnipeg|MB", SK: "regina|SK", NS: "halifax|NS",
  NB: "moncton|NB", NL: "st. john's|NL", PE: "moncton|NB",
};
const PROVINCE_NAME: Record<string, string> = {
  ontario: "ON", quebec: "QC", québec: "QC", "british columbia": "BC", alberta: "AB", manitoba: "MB", saskatchewan: "SK",
  "nova scotia": "NS", "new brunswick": "NB", "newfoundland and labrador": "NL", newfoundland: "NL", "prince edward island": "PE",
};

/** The member's city on the map, from their profile location ("Ottawa, ON", "Ontario", ...). */
export function cityFor(location: string | null | undefined): string | null {
  const l = (location ?? "").toLowerCase();
  if (!l) return null;
  for (const k of Object.keys(MAP_CITIES)) if (l.includes(k.split("|")[0])) return k;
  const code = l.match(/\b(on|qc|bc|ab|mb|sk|ns|nb|nl|pe)\b/)?.[1]?.toUpperCase() ?? Object.entries(PROVINCE_NAME).find(([n]) => l.includes(n))?.[1];
  return code ? PROVINCE_CITY[code] ?? null : null;
}

type Geo = (x: number, y: number) => [number, number, number, number];
function geometry(w: number, h: number): Geo {
  const phone = w < 640;
  // phones: flatter and shorter, so the cities stay readable below the card
  const hor = phone ? h * 0.12 : h * 0.4;
  const bot = phone ? h * 0.96 : h * 1.03;
  const span = phone ? w * 1.05 : Math.min(w * 1.45, 2100);
  const tilt = phone ? 0.7 : 0.34;
  return (x, y) => {
    const v = Math.max(0, (y - Y0) / (Y1 - Y0));
    const p = Math.pow(v, phone ? 1.3 : 1.9);
    const k = tilt + (1 - tilt) * p;
    return [w / 2 + ((x - 500) / 1000) * span * k, hor + (bot - hor) * p, k, v];
  };
}

export function CanadaHorizon() {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<{ k: string; x: number; y: number; al: "l" | "c" | "r" }[]>([]);
  const [shown, setShown] = useState(false);
  const [away, setAway] = useState(false);

  useEffect(() => {
    const el = box.current;
    const canvas = cv.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let G: Geo = geometry(1, 1);
    let raf = 0;
    let t0 = performance.now();
    let welcome: { at: number; city: string | null } | null = null;

    const size = () => {
      const r = el.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      G = geometry(w, h);
      setLabels(
        Object.keys(NAMES)
          .filter((k) => w >= 640 || ["vancouver|BC", "calgary|AB", "winnipeg|MB", "toronto|ON", "montreal|QC"].includes(k))
          .map((k) => {
            const [x, y] = G(...(MAP_CITIES[k] as [number, number]));
            // on a phone Vancouver is near the edge, so its name goes to the right of the pin
            const [dx, dy, al] = w < 640 && k === "vancouver|BC" ? ([6, 4, "l"] as const) : LABEL[k];
            return { k, x: x + dx, y: y + dy, al };
          }),
      );
    };

    const draw = (now: number) => {
      const t = still ? 99 : (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#B9B6AE";
      for (let i = 0; i < MAP_DOTS.length; i += 2) {
        const x = MAP_DOTS[i];
        const appear = 0.05 + (x / 1000) * 0.5; // west to east
        if (t < appear) continue;
        const [X, Y, s, v] = G(x, MAP_DOTS[i + 1]);
        ctx.globalAlpha = Math.min(1, (t - appear) * 4) * Math.min(1, v * 2.2) * (0.55 + 0.45 * v);
        const rise = Math.max(0, 1 - (t - appear) * 3) * 10;
        ctx.beginPath();
        ctx.arc(X, Y + rise, Math.max(0.6, 2.4 * s), 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const P = (k: string) => G(...(MAP_CITIES[k] as [number, number]));
      // introductions
      if (!still)
        ARCS.forEach(([a, b], i) => {
          const start = 1.6 + i * 0.9;
          if (t < start) return;
          const local = (t - start) % (ARCS.length * 0.9 + 2.4);
          const prog = Math.min(1, local / 1.5);
          const fade = local > 3 ? Math.max(0, 1 - (local - 3)) : 1;
          if (fade <= 0) return;
          const [x1, y1] = P(a);
          const [x2, y2] = P(b);
          const mx = (x1 + x2) / 2;
          const my = Math.min(y1, y2) - Math.hypot(x2 - x1, y2 - y1) * 0.35;
          const at = (u: number) => [(1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2];
          ctx.strokeStyle = "rgba(212,42,42,.45)";
          ctx.globalAlpha = fade * (welcome ? Math.max(0, 1 - (now - welcome.at) / 400) : 1);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let s = 0; s <= prog + 1e-6; s += 0.02) {
            const [X, Y] = at(Math.min(s, prog));
            if (s) ctx.lineTo(X, Y);
            else ctx.moveTo(X, Y);
          }
          ctx.stroke();
          if (prog < 1) {
            const [X, Y] = at(prog);
            ctx.fillStyle = "#D42A2A";
            ctx.beginPath();
            ctx.arc(X, Y, 2.4, 0, 6.283);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
      // city pins
      Object.keys(MAP_CITIES).forEach((k, i) => {
        const appear = 0.9 + i * 0.05;
        if (t < appear) return;
        const q = Math.min(1, (t - appear) * 3);
        const [x, y, s] = P(k);
        const z = Math.max(0.6, s * 1.3);
        const big = BIG.has(k);
        const beat = still ? 0 : 0.25 * Math.sin(t * 1.6 + i);
        ctx.fillStyle = "rgba(212,42,42,.14)";
        ctx.beginPath();
        ctx.arc(x, y, (big ? 7 : 5) * q * z * (1 + beat), 0, 6.283);
        ctx.fill();
        ctx.fillStyle = big ? "#D42A2A" : "#8E8C86";
        ctx.beginPath();
        ctx.arc(x, y, (big ? 3.2 : 2.4) * q * z, 0, 6.283);
        ctx.fill();
      });
      // after log-in: rings from the member's city, or softly from every big city when we don't know it
      if (welcome) {
        const lt = (now - welcome.at) / 1000;
        const from = welcome.city ? [welcome.city] : [...BIG];
        from.forEach((k, j) => {
          const [x, y] = P(k);
          for (let r = 0; r < 3; r++) {
            const ph = (lt * 0.8 + r / 3 + j * 0.13) % 1;
            ctx.strokeStyle = "#D42A2A";
            ctx.lineWidth = welcome!.city ? 2 : 1.4;
            ctx.globalAlpha = Math.max(0, (welcome!.city ? 0.7 : 0.45) - ph * 0.7) * Math.min(1, lt * 3);
            ctx.beginPath();
            ctx.arc(x, y, 8 + ph * (welcome!.city ? 90 : 50), 0, 6.283);
            ctx.stroke();
          }
        });
        ctx.globalAlpha = 1;
      }
      if (!still || welcome) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else start();
    };
    const onWelcome = (e: Event) => {
      welcome = { at: performance.now(), city: (e as CustomEvent<{ city: string | null }>).detail?.city ?? null };
      setAway(true);
      start();
    };
    const ro = new ResizeObserver(() => {
      size();
      if (still && !welcome) requestAnimationFrame(draw);
    });
    size();
    t0 = performance.now();
    start();
    const timer = window.setTimeout(() => setShown(true), still ? 0 : 1100);
    ro.observe(el);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("sa:welcome", onWelcome);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("sa:welcome", onWelcome);
    };
  }, []);

  return (
    <div className={`samap${shown && !away ? " on" : ""}`} ref={box} aria-hidden="true">
      <canvas ref={cv} />
      {labels.map(({ k, x, y, al }) => (
        <span key={k} className={`samc ${al}`} style={{ left: x, top: y }}>
          {NAMES[k]}
        </span>
      ))}
    </div>
  );
}
