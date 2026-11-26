"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { liveSince } from "@/app/(hub)/live-actions";
import { onOnline } from "@/lib/presence-client";
import type { LiveEvent, LiveKind, LivePerson } from "@/lib/network-live";
import { RxIcon } from "@/components/zip/rx-icon";
import { Ic } from "@/components/zip/ic";

type Geo = { W: number; H: number; dots: number[]; cities: Record<string, [number, number]>; provs: Record<string, [number, number, string]>; labels: [string, number, number][] };
type Me = { id: string; name: string; avatar: string | null; location: string };
type Pin = LivePerson & { x: number; y: number; dx: number; dy: number; sx: number; sy: number; k: number; col: string; ini: string; pop: number; img?: HTMLImageElement };

const COLORS = ["#2563EB", "#7C3AED", "#DB2777", "#059669", "#D97706", "#0891B2", "#DC2626", "#4F46E5", "#0D9488", "#9333EA", "#EA580C", "#16A34A"];
const PROV: Record<string, string> = { ontario: "ON", quebec: "QC", québec: "QC", "british columbia": "BC", alberta: "AB", saskatchewan: "SK", manitoba: "MB", "nova scotia": "NS", "new brunswick": "NB", "prince edward island": "PE", pei: "PE", "newfoundland and labrador": "NL", newfoundland: "NL", yukon: "YT", "northwest territories": "NT", nunavut: "NU" };
const KIND_LABEL: Record<string, string> = { all: "All", react: "Reactions", comment: "Comments", message: "Messages", view: "Profile views", post: "Posts" };
const GO: Record<LiveKind, string> = { react: "View", comment: "Reply", message: "Open", view: "Say hi", post: "Read", connect: "Say hi", booking: "View", enquiry: "Reply" };

/** Where a profile's typed location sits on the map: the city if we know it, else the province's centre, else nowhere. */
function place(geo: Geo, loc: string): [number, number] | null {
  const parts = loc.toLowerCase().replace(/[’‘`]/g, "'").replace(/\bste\b/g, "ste.").split(",").map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return null;
  const city = parts[0].replace(/^(city of|ville de)\s+/, "");
  const provRaw = parts[1] ?? "";
  const prov = provRaw.length === 2 ? provRaw.toUpperCase() : PROV[provRaw] ?? "";
  if (prov && geo.cities[`${city}|${prov}`]) return geo.cities[`${city}|${prov}`];
  const any = Object.keys(geo.cities).find((k) => k.startsWith(`${city}|`));
  if (any) return geo.cities[any];
  const p = prov ? geo.provs[prov] : PROV[city] ? geo.provs[PROV[city]] : undefined;
  return p ? [p[0], p[1]] : null;
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "M";
function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

function Face({ src, name }: { src: string | null; name: string }) {
  if (!src) return <>{initials(name)}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}

function EvIcon({ kind }: { kind: LiveKind }) {
  if (kind === "react") return <RxIcon kind="like" size={18} ring={false} />;
  const m: Record<string, [string, string]> = { comment: ["msg", "#0284C7"], message: ["mail", "#4F46E5"], view: ["eye", "#475569"], post: ["edit", "#EA580C"], connect: ["users", "#059669"], booking: ["cal2", "#7C3AED"], enquiry: ["building", "#B45309"] };
  const [n, c] = m[kind] ?? ["spark", "#2563EB"];
  return <span className="nlic" style={{ background: c }}><Ic n={n} s={11} /></span>;
}

export function LiveMap({ me, people, events: first }: { me: Me; people: LivePerson[]; events: LiveEvent[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>(first);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"all" | "online" | "today">("all");
  const [kind, setKind] = useState<string>("all");
  const [live, setLive] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<{ id: number; ev: LiveEvent }[]>([]);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // shared state the drawing loop reads without re-rendering
  const S = useRef({ zoom: 1, panX: 0, panY: -40, pins: [] as Pin[], me: null as null | { x: number; y: number }, meImg: undefined as HTMLImageElement | undefined, beams: [] as { pin: Pin; t: number; hit?: boolean }[], bursts: [] as { t: number }[], view: "all" as string, online: new Set<string>(), today: new Set<string>(), sel: null as string | null, bubbleAt: new Map<number, string>() });

  useEffect(() => { fetch("/maps/canada-live.json").then((r) => r.json()).then(setGeo).catch(() => {}); }, []);
  useEffect(() => onOnline((ids) => { const s = new Set([...ids].filter((id) => byId.has(id))); S.current.online = s; setOnline(s); }), [byId]);
  useEffect(() => { S.current.view = view; }, [view]);
  useEffect(() => { S.current.sel = sel; }, [sel]);
  useEffect(() => { S.current.today = new Set(events.filter((e) => e.kind !== "post" && isToday(e.at)).map((e) => e.who)); }, [events]);

  // pins: each connection at their city, fanned out in rings when several share a city
  const unplaced = useMemo(() => {
    if (!geo) return 0;
    const groups = new Map<string, Pin[]>();
    let missing = 0;
    const pins: Pin[] = [];
    people.slice(0, 600).forEach((p, i) => {
      const at = place(geo, p.location);
      if (!at) { missing++; return; }
      const pin: Pin = { ...p, x: at[0], y: at[1], dx: 0, dy: 0, sx: 0, sy: 0, k: 1, col: COLORS[i % COLORS.length], ini: initials(p.name), pop: 0 };
      if (p.avatar) { const img = new Image(); img.src = p.avatar; pin.img = img; }
      const key = `${at[0]},${at[1]}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(pin);
      pins.push(pin);
    });
    groups.forEach((list) => list.forEach((p, i) => {
      if (list.length === 1) return;
      let ring = 1, idx = i, cap = 6;
      while (idx >= cap) { idx -= cap; ring++; cap = ring * 6; }
      const count = Math.min(cap, list.length - (i - idx));
      const a = (idx / count) * Math.PI * 2 + ring * 0.4;
      p.dx = Math.cos(a) * ring * 21; p.dy = Math.sin(a) * ring * 21;
    }));
    S.current.pins = pins;
    const m = place(geo, me.location);
    S.current.me = m ? { x: m[0], y: m[1] } : { x: geo.W * 0.62, y: geo.H * 0.84 };
    if (me.avatar) { const img = new Image(); img.src = me.avatar; S.current.meImg = img; }
    return missing;
  }, [geo, people, me]);

  // drawing loop
  useEffect(() => {
    // no map on the page when the member has no connections yet (the invitation to connect shows instead)
    if (!geo || !cvRef.current || !mapRef.current) return;
    const cv = cvRef.current, map = mapRef.current, ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0;
    const TILT = 0.5, F = 1500, t0 = performance.now();
    const size = () => { const r = map.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const ro = new ResizeObserver(size); ro.observe(map); size();
    const T = (x: number, y: number) => {
      const st = S.current, s = Math.min(W / geo.W, H / geo.H) * 0.98 * st.zoom;
      const mx = (x - geo.W / 2) * s + st.panX, my = (y - geo.H / 2) * s + st.panY;
      const y3 = my * Math.cos(TILT), z = my * Math.sin(TILT), k = F / (F + z);
      return [W / 2 + mx * k, H * 0.5 + y3 * k, k, s] as const;
    };
    const avatar = (x: number, y: number, r: number, img: HTMLImageElement | undefined, col: string, ini: string) => {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.closePath(); ctx.clip();
      if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
      else { ctx.fillStyle = col; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.round(r * 0.78)}px 'Plus Jakarta Sans', Inter, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, x, y + 0.5); ctx.textBaseline = "alphabetic"; }
      ctx.restore();
    };
    const frame = (now: number) => {
      const st = S.current, t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      const D = geo.dots, sweep = ((t * 0.08) % 1.6 - 0.3) * geo.W;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < D.length; i += 2) {
          const [X, Y, k, s] = T(D[i], D[i + 1]);
          if (X < -10 || X > W + 10 || Y < -10 || Y > H + 10) continue;
          const r = Math.max(1.3, 1.7 * s * k);
          if (pass === 0) { ctx.fillStyle = "rgba(2,6,23,.55)"; ctx.fillRect(X - r / 2, Y - r / 2 + 4 * k, r, r); continue; }
          const north = 1 - D[i + 1] / geo.H, glow = reduced ? 0 : Math.max(0, 1 - Math.abs(D[i] - sweep) / 90);
          ctx.fillStyle = `rgba(${(110 + glow * 110) | 0},${(160 + glow * 75) | 0},255,${0.5 + north * 0.18 + glow * 0.32})`;
          ctx.fillRect(X - r / 2, Y - r / 2, r, r);
        }
      }
      ctx.textAlign = "center"; ctx.font = "600 11px Inter, system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.42)";
      for (const [n, x, y] of geo.labels) { const [X, Y] = T(x, y); ctx.fillText(n, X, Y); }
      // you
      const m = st.me!;
      const [mX, mY, mk] = T(m.x, m.y), pulse = reduced ? 0 : (t % 2) / 2;
      ctx.beginPath(); ctx.arc(mX, mY, 16 + pulse * 34, 0, 7); ctx.strokeStyle = `rgba(212,42,42,${0.6 * (1 - pulse)})`; ctx.lineWidth = 2; ctx.stroke();
      const g = ctx.createRadialGradient(mX, mY, 0, mX, mY, 48); g.addColorStop(0, "rgba(212,42,42,.45)"); g.addColorStop(1, "rgba(212,42,42,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mX, mY, 48, 0, 7); ctx.fill();
      // beams of light from a connection to you
      for (let i = st.beams.length - 1; i >= 0; i--) {
        const b = st.beams[i]; b.t += reduced ? 1 : 0.012;
        const aX = b.pin.sx, aY = b.pin.sy, cX = (aX + mX) / 2, cY = Math.min(aY, mY) - Math.hypot(mX - aX, mY - aY) * 0.32 - 20;
        const at = (u: number) => [(1 - u) * (1 - u) * aX + 2 * (1 - u) * u * cX + u * u * mX, (1 - u) * (1 - u) * aY + 2 * (1 - u) * u * cY + u * u * mY] as const;
        const head = Math.min(1, b.t), tail = Math.max(0, b.t - 0.55);
        ctx.beginPath(); for (let j = 0; j <= 30; j++) { const [x, y] = at(tail + (head - tail) * j / 30); if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        const fade = b.t > 1 ? Math.max(0, 1 - (b.t - 1) / 0.55) : 1;
        const [tx, ty] = at(tail), [hx, hy] = at(head);
        const lg = ctx.createLinearGradient(tx, ty, hx, hy); lg.addColorStop(0, "rgba(96,165,250,0)"); lg.addColorStop(1, `rgba(191,219,254,${0.95 * fade})`);
        ctx.strokeStyle = lg; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.stroke();
        if (b.t < 1) { const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10); hg.addColorStop(0, "#fff"); hg.addColorStop(1, "rgba(147,197,253,0)"); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); ctx.fill(); }
        if (b.t >= 1 && !b.hit) { b.hit = true; st.bursts.push({ t: 0 }); }
        if (b.t > 1.55) st.beams.splice(i, 1);
      }
      for (let i = st.bursts.length - 1; i >= 0; i--) { const b = st.bursts[i]; b.t += 0.03; ctx.beginPath(); ctx.arc(mX, mY, 18 + b.t * 30, 0, 7); ctx.strokeStyle = `rgba(191,219,254,${1 - b.t})`; ctx.lineWidth = 2.5; ctx.stroke(); if (b.t >= 1) st.bursts.splice(i, 1); }
      // your connections, far to near
      const z = Math.max(0.7, st.zoom * 0.9);
      for (const p of st.pins) { const [X, Y, k] = T(p.x, p.y); p.sx = X + p.dx * z * k; p.sy = Y + p.dy * z * k * 0.8; p.k = k; }
      const order = [...st.pins].sort((a, b) => a.sy - b.sy);
      for (const p of order) {
        const on = st.online.has(p.id), dim = (st.view === "online" && !on) || (st.view === "today" && !st.today.has(p.id));
        p.pop = Math.max(0, p.pop - 0.02);
        const sc = 1 + Math.sin(Math.min(1, p.pop) * Math.PI) * 0.45, r = (11 + Math.min(4, st.zoom * 2)) * p.k * sc;
        ctx.globalAlpha = dim ? 0.22 : 1;
        ctx.beginPath(); ctx.ellipse(p.sx, p.sy + r + 2, r * 0.8, r * 0.22, 0, 0, 7); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r + 2.5, 0, 7); ctx.fillStyle = on ? "#22C55E" : "rgba(255,255,255,.92)"; ctx.fill();
        avatar(p.sx, p.sy, r, p.img, p.col, p.ini);
        if (p.id === st.sel) { ctx.beginPath(); ctx.arc(p.sx, p.sy, r + 7, 0, 7); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      ctx.beginPath(); ctx.arc(mX, mY, 18 * mk, 0, 7); ctx.fillStyle = "#D42A2A"; ctx.fill();
      avatar(mX, mY, 15 * mk, st.meImg, "#D42A2A", "You");
      // keep the bubbles over their pins
      st.bubbleAt.forEach((who, id) => {
        const el = document.getElementById(`nlb-${id}`), p = st.pins.find((x) => x.id === who);
        if (el && p) { el.style.left = `${p.sx}px`; el.style.top = `${p.sy}px`; }
      });
      const card = document.getElementById("nlcard"), sp = st.pins.find((x) => x.id === st.sel);
      if (card && sp) { const w = card.offsetWidth || 290, h = card.offsetHeight || 240; let x = sp.sx + 24; const y = Math.max(70, Math.min(H - h - 12, sp.sy - h / 2)); if (x + w > W - 12) x = sp.sx - w - 24; card.style.left = `${Math.max(12, x)}px`; card.style.top = `${y}px`; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // dragging, zooming, picking a person
    let drag: { x: number; y: number } | null = null, moved = 0;
    const hit = (x: number, y: number) => { let best: Pin | null = null, bd = 1e9; for (const p of S.current.pins) { const d = Math.hypot(x - p.sx, y - p.sy); if (d < 16 && d < bd) { bd = d; best = p; } } return best; };
    const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; moved = 0; cv.setPointerCapture(e.pointerId); cv.classList.add("drag"); };
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      if (drag) { S.current.panX += e.clientX - drag.x; S.current.panY += (e.clientY - drag.y) / Math.cos(TILT); moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); drag = { x: e.clientX, y: e.clientY }; return; }
      cv.style.cursor = hit(e.clientX - r.left, e.clientY - r.top) ? "pointer" : "grab";
    };
    const up = (e: PointerEvent) => { cv.classList.remove("drag"); const was = drag; drag = null; if (was && moved < 6) { const r = cv.getBoundingClientRect(); const p = hit(e.clientX - r.left, e.clientY - r.top); setSel(p ? p.id : null); } };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const st = S.current, z = Math.max(0.8, Math.min(4, st.zoom * (e.deltaY < 0 ? 1.12 : 0.9))); st.panX *= z / st.zoom; st.panY *= z / st.zoom; st.zoom = z; };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("wheel", wheel, { passive: false });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move); cv.removeEventListener("pointerup", up); cv.removeEventListener("wheel", wheel); };
  }, [geo]);

  // a new event: the person's pin pops, a card shows above it, and a beam travels to you when it involves you
  const bubbleId = useRef(0);
  const show = (ev: LiveEvent) => {
    const pin = S.current.pins.find((p) => p.id === ev.who);
    if (!pin) return;
    pin.pop = 1;
    if (ev.kind !== "post" && !matchMedia("(prefers-reduced-motion: reduce)").matches) S.current.beams.push({ pin, t: 0 });
    const id = ++bubbleId.current;
    S.current.bubbleAt.set(id, ev.who);
    setBubbles((b) => [...b.slice(-2), { id, ev }]);
    setTimeout(() => { S.current.bubbleAt.delete(id); setBubbles((b) => b.filter((x) => x.id !== id)); }, 4200);
  };

  // on arrival, replay the latest few so the map comes alive; then look for new ones every 20 seconds
  useEffect(() => {
    if (!geo) return;
    const recent = first.slice(0, 4).reverse();
    const timers = recent.map((ev, i) => setTimeout(() => show(ev), 700 + i * 1700));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);
  useEffect(() => {
    if (!live) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const after = events[0]?.at ?? new Date(Date.now() - 60_000).toISOString();
      try {
        const fresh = await liveSince(after);
        setEvents((cur) => {
          const seen = new Set(cur.map((e) => e.key));
          const add = fresh.filter((e) => !seen.has(e.key));
          add.slice(0, 5).reverse().forEach((e, i) => setTimeout(() => show(e), i * 1400));
          return add.length ? [...add, ...cur].slice(0, 120) : cur;
        });
      } catch { /* try again next time */ }
    };
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, events[0]?.key]);

  const zoomBy = (f: number) => { const st = S.current, z = Math.max(0.8, Math.min(4, st.zoom * f)); st.panX *= z / st.zoom; st.panY *= z / st.zoom; st.zoom = z; };
  const reset = () => { Object.assign(S.current, { zoom: 1, panX: 0, panY: -40 }); setSel(null); };
  const meMissing = geo ? !place(geo, me.location) : false;
  const rows = events.filter((e) => byId.has(e.who) && (kind === "all" || e.kind === kind));
  const selP = sel ? byId.get(sel) : null;
  const lastOf = (id: string) => events.find((e) => e.who === id && e.kind !== "post");
  const today = new Set(events.filter((e) => e.kind !== "post" && isToday(e.at)).map((e) => e.who));
  const cities = new Set(people.map((p) => p.location.split(",")[0].trim().toLowerCase()).filter(Boolean)).size;

  if (!people.length) {
    return (
      <div className="nlempty card">
        <h2>Your map fills in as you connect</h2>
        <p className="muted">Connect with owners you know or would like to know. They appear here at their city, and you see the moment they reach out to you.</p>
        <Link className="btn" href="/network">Find people to connect with</Link>
      </div>
    );
  }

  return (
    <div className="nlmain">
      <section className="nlmap" ref={mapRef} aria-label="Map of Canada with your connections">
        <canvas ref={cvRef} />
        <div className="nlstats">
          <div><b>{people.length}</b><span>Connections</span></div>
          <div><b>{online.size}</b><span>Online now</span></div>
          <div><b>{today.size}</b><span>Reached out today</span></div>
          <div><b>{cities}</b><span>Cities</span></div>
        </div>
        <div className="nlseg" role="group" aria-label="Show">
          {(["all", "online", "today"] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v === "all" ? "Everyone" : v === "online" ? "Online now" : "Reached out today"}</button>)}
        </div>
        <div className="nllegend"><span><i className="you" />You</span><span><i className="on" />Online</span><span><i className="beam" />Reaching you now</span>{unplaced > 0 && <span>{unplaced} without a city on their profile</span>}{meMissing && <Link href="/profile/edit" className="nladd">Add your city to place yourself</Link>}</div>
        <div className="nlctl">
          <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.35)}>−</button>
          <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.35)}>+</button>
          <button type="button" onClick={reset}>Whole country</button>
          <button type="button" className={live ? "on" : ""} aria-pressed={live} onClick={() => setLive(!live)}>{live ? "Live" : "Paused"}</button>
        </div>
        {bubbles.map(({ id, ev }) => { const p = byId.get(ev.who); return p ? (
          <div key={id} id={`nlb-${id}`} className="nlbub"><EvIcon kind={ev.kind} /><b>{p.name.split(" ")[0]}</b> <span>{ev.text}</span></div>
        ) : null; })}
        {selP && (
          <div className="nlcard" id="nlcard" role="dialog" aria-label={selP.name}>
            <button type="button" className="x" aria-label="Close" onClick={() => setSel(null)}>×</button>
            <div className="t">
              <span className="nlav"><Face src={selP.avatar} name={selP.name} />{online.has(selP.id) && <i />}</span>
              <div><h3>{selP.name}</h3><div className="muted small">{selP.headline}</div><div className="muted small">{selP.location}{online.has(selP.id) && <> · <b style={{ color: "#15803D" }}>Online now</b></>}</div></div>
            </div>
            <div className="meta"><div><b>{selP.since ? new Date(selP.since).toLocaleDateString("en-CA", { month: "short", year: "numeric" }) : "—"}</b>connected since</div><div><b>{events.filter((e) => e.who === selP.id && e.kind !== "post").length}</b>reached out this week</div></div>
            {(() => { const l = lastOf(selP.id); return <div className="last">{l ? <>Last: {l.text}{l.quote ? ` “${l.quote}”` : ""} · {ago(l.at)}</> : "No interactions with you this week."}</div>; })()}
            <div className="acts"><Link className="btn" href={`/members/${selP.id}`}>View profile</Link><Link className="btn p" href={`/messages?with=${selP.id}`}>Message</Link></div>
          </div>
        )}
      </section>
      <aside className="nlside">
        <div className="sh">
          <h2><i className="nldot" />Live from your network</h2>
          <p className="muted small">What your connections do that involves you, newest first.</p>
          <div className="chips">{Object.keys(KIND_LABEL).map((k) => <button key={k} type="button" className={`chip${kind === k ? " on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>)}</div>
        </div>
        <div className="nllist" aria-live="polite">
          {rows.length ? rows.map((e) => { const p = byId.get(e.who)!; return (
            <div key={e.key} className="it">
              <button type="button" className="nlav sm" onClick={() => setSel(p.id)} aria-label={`Show ${p.name} on the map`}><Face src={p.avatar} name={p.name} />{online.has(p.id) && <i />}</button>
              <div className="tx"><b>{p.name}</b> <EvIcon kind={e.kind} /> {e.text}{e.quote && <span className="q"> “{e.quote}”</span>}<time dateTime={e.at}>{p.location ? `${p.location} · ` : ""}{ago(e.at)}</time></div>
              <Link className="go" href={e.href}>{GO[e.kind]}</Link>
            </div>
          ); }) : <div className="nlnone">Nothing here yet this week. It fills in as your connections reach out.</div>}
        </div>
      </aside>
    </div>
  );
}
