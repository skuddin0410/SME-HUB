"use client";

import MPD from "@/lib/zip/mapdata.json";
import { ZipAv } from "@/components/zip/bits";
import { PROV_NAMES as PNAME } from "@/lib/grants";

/**
 * Update 25: a real map of Canada on the Member directory (Natural Earth shapes, Lambert conformal conic, made by
 * scripts/genmap.mjs). Pins sit at each member's city; cities closer than 28 map units share one pin with a count,
 * and tapping a shared pin again moves to the next member there. A city not on the list goes to the middle of
 * its province.
 */
type Pt = [number, number];
const D = MPD as unknown as { W: number; H: number; can: Record<string, string>; usa: string; lakes: string; lab: Record<string, Pt>; cities: Record<string, Pt>; provc: Record<string, Pt> };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'").toLowerCase().trim();
const CITY = new Map(Object.entries(D.cities).map(([k, v]) => [norm(k), [k, v] as [string, Pt]]));

export type MapMember = { id: string; name: string; city: string; avatar: string | null };

/** "Toronto, ON" → the city's name and map position, or the province's middle. */
function placeOf(loc: string): { key: string; at: Pt; prov: string } | null {
  const [city = "", prov = ""] = loc.split(",").map((x) => x.trim());
  const hit = CITY.get(norm(city));
  if (hit) return { key: hit[0], at: hit[1], prov: prov.toUpperCase() };
  const p = prov.toUpperCase();
  return D.provc[p] ? { key: PNAME[p] ?? p, at: D.provc[p], prov: p } : null;
}

export function MemberMap({ members, sel, onPick, province }: { members: MapMember[]; sel: MapMember | null; onPick: (id: string) => void; province: string }) {
  const { W, H } = D;
  const byCity = new Map<string, { at: Pt; m: MapMember[] }>();
  for (const m of members) {
    const p = placeOf(m.city);
    if (!p) continue;
    const c = byCity.get(p.key) ?? { at: p.at, m: [] };
    c.m.push(m);
    byCity.set(p.key, c);
  }
  // group cities that would overlap on the map
  const groups: { x: number; y: number; cities: string[]; m: MapMember[] }[] = [];
  for (const [k, c] of byCity) {
    const hit = groups.find((g) => g.cities.some((o) => { const a = byCity.get(o)!.at; return Math.abs(a[0] - c.at[0]) < 28 && Math.abs(a[1] - c.at[1]) < 28; }));
    if (hit) { hit.cities.push(k); hit.m.push(...c.m); const n = hit.cities.length; hit.x = (hit.x * (n - 1) + c.at[0]) / n; hit.y = (hit.y * (n - 1) + c.at[1]) / n; }
    else groups.push({ x: c.at[0], y: c.at[1], cities: [k], m: [...c.m] });
  }
  const selProv = sel ? placeOf(sel.city)?.prov ?? "" : "";
  const hide = new Set(["NB", "NS", "PE"]);
  const nCities = byCity.size;
  const nMem = [...byCity.values()].reduce((n, c) => n + c.m.length, 0);
  const pick = (g: (typeof groups)[number]) => {
    const i = g.m.findIndex((m) => m.id === sel?.id);
    onPick(g.m[(i + 1) % g.m.length].id);
  };
  return (
    <div className="mpbox" style={{ aspectRatio: `${W}/${H}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <rect className="mpsea" width={W} height={H} />
        <path className="mpusa" d={D.usa} />
        {Object.entries(D.can).map(([p, d]) => <path key={p} className={`mpprov${p === selProv ? " sel" : ""}${province && p === province ? " flt" : ""}`} d={d} />)}
        <path className="mplake" d={D.lakes} />
        {Object.entries(D.lab).filter(([p, c]) => !hide.has(p) && c[0] > 10 && c[0] < W - 10 && c[1] > 10 && c[1] < H - 10).map(([p, c]) => <text key={p} x={c[0]} y={c[1]} className="mplab">{p}</text>)}
      </svg>
      {groups.map((g) => {
        const has = g.m.some((m) => m.id === sel?.id);
        const cur = g.m.find((m) => m.id === sel?.id) ?? g.m[0];
        const cs = g.cities;
        const label = cs.length > 2 ? `${cs[0]} area` : cs.length === 1 ? cs[0] : `${cs.slice(0, -1).join(", ")} and ${cs[cs.length - 1]}`;
        const names = g.m.map((m) => `${m.name} (${m.city.split(",")[0].trim()})`).join(", ");
        const edge = (g.x < W * 0.16 ? " l" : g.x > W * 0.84 ? " r" : "") + (g.y > H * 0.8 ? " up" : "");
        return (
          <button key={cs.join("|")} type="button" className={`mppin${has ? " on" : ""}${edge}`} style={{ left: `${((g.x / W) * 100).toFixed(2)}%`, top: `${((g.y / H) * 100).toFixed(2)}%` }}
            aria-pressed={has} aria-label={`${label}: ${g.m.length}${g.m.length > 1 ? " members, " : " member, "}${names}`} title={names} onClick={() => pick(g)}>
            <ZipAv name={cur.name} src={cur.avatar} size="s" />
            {g.m.length > 1 && <b className="mpn">{g.m.length}</b>}
            <span className="mpcity">{label}{g.m.length > 1 ? ` · ${g.m.length} members` : ""}</span>
          </button>
        );
      })}
      <div className="mpkey"><b>{nMem}</b> member{nMem === 1 ? "" : "s"} in <b>{nCities}</b> {nCities === 1 ? "city" : "cities"}<span className="mptip"> · Tap a pin to see who’s there</span></div>
    </div>
  );
}
