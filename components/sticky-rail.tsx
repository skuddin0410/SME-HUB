"use client";

import { useEffect, useRef, useState } from "react";

/** Header height (62px) plus breathing room. */
const HEADER_GAP = 78;
const BOTTOM_GAP = 16;

/**
 * Keeps a rail in view while the feed scrolls.
 * - pinned: never moves. It sits under the header, and if it is taller than the window it scrolls
 *   inside itself (thin scrollbar), so its last card is still reachable.
 * - otherwise a rail shorter than the window sticks under the header, and a taller one scrolls until
 *   its last card is fully visible, then sticks there.
 */
export function StickyRail({ children, className = "", pinned = false }: { children: React.ReactNode; className?: string; pinned?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(HEADER_GAP);

  useEffect(() => {
    if (pinned) return;
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
  }, [pinned]);

  if (pinned) {
    return (
      <div
        className={`sticky overflow-y-auto overscroll-contain rail-scroll ${className}`}
        style={{ top: HEADER_GAP, maxHeight: `calc(100vh - ${HEADER_GAP + BOTTOM_GAP}px)` }}
      >
        {children}
      </div>
    );
  }
  return (
    <div ref={ref} className={`sticky ${className}`} style={{ top }}>
      {children}
    </div>
  );
}
