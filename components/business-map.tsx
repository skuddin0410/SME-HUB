"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { placeFor } from "@/lib/canada-cities";

export type BusinessCity = { city: string; province: string; businesses: number };

/** One circle per city. Needs the public Mapbox token; without it the same cities show as a list. */
export function BusinessMap({ cities, token, base }: { cities: BusinessCity[]; token?: string; base: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const href = (c: BusinessCity) => `${base}${base.includes("?") ? "&" : "?"}${new URLSearchParams({ city: c.city, province: c.province }).toString()}`;

  useEffect(() => {
    if (!token || !box.current) return;
    let map: import("mapbox-gl").Map | undefined;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !box.current) return;
        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({ container: box.current, style: "mapbox://styles/mapbox/light-v11", bounds: [[-141, 41.5], [-52, 60]], fitBoundsOptions: { padding: 20 }, cooperativeGestures: true });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        for (const c of cities) {
          const at = placeFor(`${c.city}, ${c.province}`);
          if (!at) continue;
          const size = Math.min(44, 18 + Math.sqrt(c.businesses) * 6);
          const el = document.createElement("a");
          el.href = href(c);
          el.setAttribute("aria-label", `${c.businesses} ${c.businesses === 1 ? "business" : "businesses"} in ${c.city}, ${c.province}`);
          el.className = "flex items-center justify-center rounded-full bg-blue-600/85 text-xs font-semibold text-white ring-2 ring-white";
          el.style.cssText = `width:${size}px;height:${size}px`;
          el.textContent = String(c.businesses);
          new mapboxgl.Marker({ element: el }).setLngLat(at).addTo(map);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // pins only change when the filters change, which reloads the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const list = (
    <ul className="grid gap-x-6 sm:grid-cols-2" aria-label="Businesses by city">
      {cities.map((c) => (
        <li key={`${c.city}-${c.province}`} className="border-b py-2 text-sm">
          <Link href={href(c)} className="flex justify-between hover:underline">
            <span>
              {c.city}, {c.province}
            </span>
            <span className="font-semibold">{c.businesses}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (cities.length === 0) return <p className="panel p-6 text-sm text-muted-foreground">No businesses share a city for this search.</p>;
  return (
    <section className="panel p-4" aria-label="Business map">
      {token && !failed ? (
        <>
          <div ref={box} role="region" aria-label="Map of business cities" className="h-[26.25rem] w-full overflow-hidden rounded-lg bg-muted" />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Show as a list</summary>
            {list}
          </details>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{failed ? "The map could not load, so here are the cities." : "Businesses by city."}</p>
          {list}
        </>
      )}
    </section>
  );
}
