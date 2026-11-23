// The guide's simplified map of Canada: land outline, city positions and the pin projection. Pure, so the server and the browser agree.

type LngLat = [number, number];

/** Longitude and latitude of the cities members live in. Anything not listed is placed at the middle of its province. */
export const GEO: Record<string, LngLat> = {
  Toronto: [-79.4, 43.7], Mississauga: [-79.65, 43.6], Kitchener: [-80.5, 43.45], Ottawa: [-75.7, 45.4], Montreal: [-73.6, 45.5],
  "Quebec City": [-71.2, 46.8], Halifax: [-63.6, 44.65], Moncton: [-64.8, 46.1], "St. John's": [-52.7, 47.56], Winnipeg: [-97.1, 49.9],
  Saskatoon: [-106.7, 52.1], Calgary: [-114.1, 51.05], Edmonton: [-113.5, 53.5], Vancouver: [-123.1, 49.3], Victoria: [-123.4, 48.4],
  Hamilton: [-79.87, 43.26], London: [-81.25, 42.98], Windsor: [-83.03, 42.31], Brampton: [-79.76, 43.73], Markham: [-79.34, 43.86],
  Oakville: [-79.67, 43.45], Guelph: [-80.25, 43.55], Waterloo: [-80.52, 43.47], Barrie: [-79.69, 44.39], Kingston: [-76.49, 44.23],
  Sudbury: [-80.99, 46.49], "Thunder Bay": [-89.25, 48.38], Laval: [-73.71, 45.61], Sherbrooke: [-71.9, 45.4], Gatineau: [-75.7, 45.48],
  Surrey: [-122.85, 49.19], Burnaby: [-122.98, 49.25], Kelowna: [-119.5, 49.89], Nanaimo: [-123.94, 49.17], Regina: [-104.62, 50.45],
  "Red Deer": [-113.81, 52.27], Lethbridge: [-112.84, 49.69], Fredericton: [-66.64, 45.96], "Saint John": [-66.06, 45.27],
  Charlottetown: [-63.13, 46.24], Whitehorse: [-135.05, 60.72], Yellowknife: [-114.37, 62.45], Iqaluit: [-68.52, 63.75],
};

const PROVINCE_CENTRE: Record<string, LngLat> = {
  BC: [-124, 54], AB: [-115, 54], SK: [-106, 54], MB: [-98, 54], ON: [-85, 50], QC: [-72, 50], NB: [-66, 46.5], NS: [-63, 45],
  PE: [-63.2, 46.3], NL: [-57, 53], YT: [-135, 64], NT: [-119, 64.5], NU: [-95, 65],
};

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").trim().toLowerCase();
const GEO_KEYS = new Map(Object.entries(GEO).map(([k, v]) => [fold(k), v]));

/** Where a member's "City, ON" sits on the map, or null when there is no location. */
export function placeOf(location: string): LngLat | null {
  const [city, prov] = location.split(",").map((s) => s.trim());
  if (!city) return null;
  return GEO_KEYS.get(fold(city)) ?? PROVINCE_CENTRE[(prov ?? "").toUpperCase()] ?? null;
}

export const LAND: LngLat[] = [[-123.2,48.4],[-128,51],[-131,54.5],[-135,59.5],[-139,60],[-141,60],[-141,69.5],[-128,70.3],[-115,68.5],[-105,68.5],[-95,68],[-94,64],[-92,61.5],[-94.5,58.7],[-92.5,57],[-88,56.5],[-82.5,55.2],[-82,53],[-79.5,51.5],[-79,54.5],[-77,57],[-78,60],[-77.5,62.5],[-73,62],[-69.5,60.5],[-66,58.5],[-64.5,60.3],[-61.5,56.5],[-57.5,54],[-55.7,52],[-60,50.2],[-66.5,50.2],[-64.5,49],[-64.8,47],[-61,46.8],[-60,46.3],[-61,45.2],[-65.7,43.5],[-66.2,44.5],[-64.5,45.4],[-67,45.2],[-67.8,47],[-69.2,47.4],[-71,45.2],[-74.7,45],[-76.5,44.2],[-79.2,43.4],[-79,42.9],[-82.5,42],[-83,42.3],[-82.4,43],[-82.2,45.3],[-84.5,46.5],[-88.5,48.3],[-89.5,48],[-95.2,49],[-123.2,49]];
export const NFLD: LngLat[] = [[-59.3,47.6],[-57.4,50.7],[-55.5,51.6],[-53,48.5],[-52.7,47],[-55.5,46.9]];
export const MAP_LABELS: [string, number, number][] = [["BC",-125,56],["AB",-115,57],["SK",-106,57],["MB",-98,56],["ON",-87,51.5],["QC",-73,53],["NL",-62,54],["NT",-120,63.5],["NU",-98,64],["YT",-136,63]];

export const proj = (p: LngLat): [number, number] => [Math.round((p[0] + 141) * 7.8 * 10) / 10 + 4, Math.round((66 - p[1]) * 12.2 * 10) / 10];
export const outline = (a: LngLat[]) => "M" + a.map((p) => proj(p).join(" ")).join("L") + "Z";

/** Spreads pins that would land on top of each other, as the guide does. Returns left and top in percent. */
export function placePins(items: { id: string; at: LngLat }[]): Map<string, { left: number; top: number }> {
  const offs = [[0,0],[0,-31],[31,0],[-31,0],[31,-31],[-31,-31],[0,-62],[62,0],[-62,0],[0,31]];
  const used: [number, number][] = [];
  const out = new Map<string, { left: number; top: number }>();
  for (const it of items) {
    const c = proj(it.at);
    let x = c[0], y = c[1];
    for (const [dx, dy] of offs) {
      x = c[0] + dx;
      y = Math.min(280, c[1] + dy);
      if (!used.some((u) => Math.abs(u[0] - x) < 29 && Math.abs(u[1] - y) < 29)) break;
    }
    used.push([x, y]);
    out.set(it.id, { left: Math.round((x / 7) * 100) / 100, top: Math.round((y / 3) * 100) / 100 });
  }
  return out;
}
