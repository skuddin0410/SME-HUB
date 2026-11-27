"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onOnline } from "@/lib/presence-client";

/**
 * "Your network, live" (option C): a small white chip with a transmission tower and "Live"; blue and red circular
 * signals ripple out from the tower tip across the header. The line under the label is the real number of the member's
 * connections who have SME Hub open now. With nobody online it says so and the signals slow down.
 * Decorative motion stops with reduced motion (CSS), and pauses while the tab is hidden.
 */
export function LiveTowerButton({ network }: { network: string[] }) {
  const [count, setCount] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const mine = new Set(network);
    return onOnline((ids) => setCount([...ids].filter((id) => mine.has(id)).length));
  }, [network]);
  useEffect(() => {
    const vis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const quiet = count === 0;
  const label = count ? `Your network, live: ${count} online now` : "Your network, live";
  return (
    <div className={`nltw${quiet ? " quiet" : ""}${hidden ? " paused" : ""}`}>
      <span className="nlrings" aria-hidden="true"><span /><span /><span /></span>
      <Link className="nlbtn" href="/network/live" aria-label={label} title={count ? `${count} of your connections online now` : "See your network live"}>
        <svg className="nltower" width="16" height="19" viewBox="0 0 22 26" aria-hidden="true">
          <path className="mast" d="M11 7 L5 24 M11 7 L17 24 M7.4 17.2 H14.6 M6.2 20.6 H15.8 M8.6 13.6 H13.4 M7.4 17.2 L13.4 13.6 M14.6 17.2 L8.6 13.6" />
          <circle className="tip" cx="11" cy="5.2" r="2.6" />
        </svg>
        Live
        {count ? <span className="nlcount" aria-hidden="true">{count > 99 ? "99+" : count}</span> : null}
      </Link>
    </div>
  );
}
