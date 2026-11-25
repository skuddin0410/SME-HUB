"use client";
import { useInstant } from "@/lib/optimistic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleFollow } from "@/app/(hub)/business-actions";

/** Follow button in the guide's style, with the same saving as the old one. */
export function ZipFollow({ companyId, following, signedIn }: { companyId: string; following: boolean; signedIn: boolean }) {
  const router = useRouter();
  const { value: on, set, tap } = useInstant(following, "Following didn’t save. Try again.");
  const flip = () => {
    if (!signedIn) return router.push("/auth/login");
    set(!on, () => toggleFollow(companyId, !on));
  };
  return (
    <button type="button" className={`btn ghost ${tap}`} aria-pressed={on} onClick={flip}>
      {on ? "✓ Following" : "+ Follow"}
    </button>
  );
}

/** Share the page: the phone's share sheet when there is one, otherwise copy the link. */
export function ShareBtn({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };
  return (
    <button type="button" className="btn ghost sm" onClick={go}>
      {done ? "Link copied" : "Share"}
    </button>
  );
}

/** Five stars in the guide's amber. */
export function ZipStars({ value, lg }: { value: number; lg?: boolean }) {
  return (
    <span className={`bzst${lg ? " lg" : ""}`} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={value >= i - 0.25 ? "on" : value >= i - 0.75 ? "half" : ""}>★</span>
      ))}
    </span>
  );
}
