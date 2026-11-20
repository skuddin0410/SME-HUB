"use client";

import { useEffect, useRef, useState } from "react";

/** Header height (62px) plus breathing room. */
const HEADER_GAP = 78;
const BOTTOM_GAP = 16;

/**
 * Keeps a rail in view while the feed scrolls. A rail shorter than the window sticks just under the
 * header. A taller one scrolls until its last card is fully visible, then sticks there, so nothing in
 * it is ever out of reach.
 */
export function StickyRail({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(HEADER_GAP);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setTop(Math.min(HEADER_GAP, window.innerHeight - el.offsetHeight - BOTTOM_GAP));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div ref={ref} className={`sticky ${className}`} style={{ top }}>
      {children}
    </div>
  );
}
