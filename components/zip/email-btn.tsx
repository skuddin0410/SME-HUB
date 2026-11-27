"use client";

import { Ic } from "@/components/zip/ic";

/** Update 31: the Email button on a card page. The address isn't in the page's HTML, so bots can't collect it; it's put together when tapped. */
export function EmailBtn({ enc }: { enc: string }) {
  return (
    <button
      type="button"
      className="btn ghost"
      onClick={() => {
        try {
          window.location.href = `mailto:${atob(enc.split("").reverse().join(""))}`;
        } catch {
          /* nothing to do */
        }
      }}
    >
      <Ic n="mail" s={15} />Email
    </button>
  );
}
