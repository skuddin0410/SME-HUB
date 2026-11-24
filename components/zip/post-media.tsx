"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";

/**
 * A post's video and photos (Update 10). The video plays inline with controls and never starts on its own.
 * 1 photo is full width, 2 side by side, 3 one large and two stacked, 4 or more a 2 × 2 grid with +N on the last.
 * Selecting a photo opens it large; arrows, swiping and the Previous / Next buttons go through all of them.
 */
export function PostMedia({ images, video, poster }: { images: string[]; video: string | null; poster: string | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touch = useRef<number | null>(null);
  const n = images.length;
  const go = (by: number) => setOpen((i) => (i === null ? i : (i + by + n) % n));
  const close = () => { setOpen(null); setTimeout(() => opener.current?.focus(), 0); };
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  if (!n && !video) return null;
  return (
    <>
      {video && (
        <div className="cpvpost">
          <video src={video} poster={poster ?? undefined} controls playsInline preload="metadata" aria-label="Video in this post" />
        </div>
      )}
      {n > 0 && (
        <div className={`cpgal n${Math.min(n, 4)}`}>
          {images.slice(0, 4).map((u, i) => (
            <button key={u + i} type="button" className="cpgi" aria-label={`Open photo ${i + 1} of ${n}`}
              onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}>
              <img src={u} alt="" loading="lazy" />
              {i === 3 && n > 4 && <span className="cpmore" aria-hidden="true">+{n - 4}</span>}
            </button>
          ))}
        </div>
      )}
      {open !== null && (
        <div className="overlay cplb" onClick={close}>
          <div className="modal cplbm" role="dialog" aria-modal="true" aria-label={`Photo ${open + 1} of ${n}`} onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const x0 = touch.current, x1 = e.changedTouches[0]?.clientX;
              touch.current = null;
              if (x0 != null && x1 != null && Math.abs(x1 - x0) > 40) go(x1 < x0 ? 1 : -1);
            }}>
            <img src={images[open]} alt={`Photo ${open + 1} of ${n}`} />
            <div className="row" style={{ justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span className="small muted" aria-live="polite">{open + 1} of {n}</span>
              <span className="row" style={{ gap: 6 }}>
                {n > 1 && <button type="button" className="btn sm ghost" onClick={() => go(-1)} aria-label="Previous photo"><Ic n="left" s={14} />Previous</button>}
                {n > 1 && <button type="button" className="btn sm ghost" onClick={() => go(1)} aria-label="Next photo">Next<Ic n="right" s={14} /></button>}
                <button type="button" className="btn sm" onClick={close} autoFocus>Close</button>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
