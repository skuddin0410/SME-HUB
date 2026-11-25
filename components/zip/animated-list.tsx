"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";

/**
 * Motion plan, phase 2: lists that change (a new post, an answered request, a removed comment, new filter
 * results) slide items in and close the gaps instead of jumping. 180 ms, the Hub's easing. People who ask for
 * less motion get the change straight away (AutoAnimate follows the system setting).
 */
export const LIST_MOTION = { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" } as const;

export function useListMotion<T extends HTMLElement>() {
  const [ref] = useAutoAnimate<T>(LIST_MOTION);
  return ref;
}

export function AnimatedList({ className, style, children, label }: { className?: string; style?: React.CSSProperties; children: React.ReactNode; label?: string }) {
  const ref = useListMotion<HTMLDivElement>();
  return <div ref={ref} className={className} style={style} aria-label={label}>{children}</div>;
}
