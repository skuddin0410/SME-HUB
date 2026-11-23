"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** New posts arrive on their own: refresh the feed now and then while the tab is open and nobody is typing. */
export function FeedRefresh({ everySeconds = 90 }: { everySeconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      const typing = document.activeElement instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
      if (document.visibilityState === "visible" && !typing) router.refresh();
    }, everySeconds * 1000);
    return () => clearInterval(id);
  }, [router, everySeconds]);
  return null;
}
