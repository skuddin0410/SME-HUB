"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { placeFor } from "@/lib/canada-cities";

export type CityCount = { location: string; members: number };

/**
 * Map of where members are, one circle per city. The public Mapbox token comes from the site's settings
 * (NEXT_PUBLIC_MAPBOX_TOKEN); without it the same information shows as a list, so the page still works.
 */
export function MemberMap({ cities, token, query }: { cities: CityCount[]; token?: string; query: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const pins = cities.map((c) => ({ ...c, at: placeFor(c.location) })).filter((c): c is CityCount & { at: [number, number] } => !!c.at);

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
        for (const p of pins) {
          const size = Math.min(44, 18 + Math.sqrt(p.members) * 6);
          const el = document.createElement("a");
          el.href = `/members?${new URLSearchParams({ q: p.location.split(",")[0] }).toString()}`;
          el.setAttribute("aria-label", `${p.members} ${p.members === 1 ? "member" : "members"} in ${p.location}`);
          el.className = "flex items-center justify-center rounded-full bg-blue-600/85 text-xs font-semibold text-white ring-2 ring-white";
          el.style.cssText = `width:${size}px;height:${size}px`;
          el.textContent = String(p.members);
          new mapboxgl.Marker({ element: el }).setLngLat(p.at).addTo(map);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // the pins only change when the filters change, which reloads the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const list = (
    <ul className="grid gap-x-6 sm:grid-cols-2" aria-label="Members by city">
      {cities.map((c) => (
        <li key={c.location} className="border-b py-2 text-sm">
          <Link href={`/members?${new URLSearchParams({ q: c.location.split(",")[0] }).toString()}`} className="flex justify-between hover:underline">
            <span>{c.location}</span>
            <span className="font-semibold">{c.members}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  if (cities.length === 0) return <p className="panel p-6 text-sm text-muted-foreground">No members share a city for this search.</p>;
  return (
    <section className="panel p-4" aria-label="Member map" data-query={query}>
      {token && !failed ? (
        <>
          <div ref={box} role="region" aria-label="Map of member cities" className="h-[26.25rem] w-full overflow-hidden rounded-lg bg-muted" />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold">Show as a list</summary>
            {list}
          </details>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{failed ? "The map could not load, so here are the cities." : "Members by city."}</p>
          {list}
        </>
      )}
    </section>
  );
}
