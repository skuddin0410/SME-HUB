// Where to put a pin for a member's "City, PR". Cities are public places, not addresses; unknown cities
// fall back to the middle of the province, so nobody is ever placed more precisely than their city.
const CITIES: Record<string, [number, number]> = {
  toronto: [-79.38, 43.65], mississauga: [-79.64, 43.59], brampton: [-79.76, 43.73], hamilton: [-79.87, 43.26], kitchener: [-80.49, 43.45],
  waterloo: [-80.52, 43.46], london: [-81.25, 42.98], windsor: [-83.03, 42.32], ottawa: [-75.7, 45.42], oshawa: [-78.86, 43.9],
  montreal: [-73.57, 45.5], "quebec city": [-71.21, 46.81], quebec: [-71.21, 46.81], laval: [-73.71, 45.61], gatineau: [-75.7, 45.48], sherbrooke: [-71.9, 45.4],
  halifax: [-63.58, 44.65], moncton: [-64.78, 46.09], fredericton: [-66.64, 45.96], "saint john": [-66.06, 45.27], charlottetown: [-63.13, 46.24],
  "st. john's": [-52.71, 47.56], "st john's": [-52.71, 47.56],
  winnipeg: [-97.14, 49.9], regina: [-104.62, 50.45], saskatoon: [-106.67, 52.13],
  calgary: [-114.07, 51.05], edmonton: [-113.49, 53.55], "red deer": [-113.81, 52.27], lethbridge: [-112.84, 49.69],
  vancouver: [-123.12, 49.28], surrey: [-122.85, 49.19], burnaby: [-122.98, 49.25], victoria: [-123.37, 48.43], kelowna: [-119.5, 49.89],
  whitehorse: [-135.06, 60.72], yellowknife: [-114.37, 62.45], iqaluit: [-68.52, 63.75],
};
const PROVINCES: Record<string, [number, number]> = {
  AB: [-114.4, 54.5], BC: [-125.0, 54.5], MB: [-98.3, 54.5], NB: [-66.4, 46.6], NL: [-58.5, 53.5], NS: [-63.0, 45.1], NT: [-119.0, 64.5],
  NU: [-92.0, 66.0], ON: [-85.0, 49.5], PE: [-63.3, 46.4], QC: [-72.0, 52.0], SK: [-106.0, 54.5], YT: [-135.5, 64.5],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/’/g, "'").trim();

/** [longitude, latitude] for "Montréal, QC", or null when neither the city nor the province is known. */
export function placeFor(location: string): [number, number] | null {
  const [city, province] = location.split(",").map((p) => p.trim());
  return CITIES[norm(city ?? "")] ?? PROVINCES[(province ?? "").toUpperCase()] ?? null;
}
