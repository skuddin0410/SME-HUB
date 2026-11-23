"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Links from the old single-page Help Centre looked like /#/a/<id>. The browser keeps that part to itself, so move them to the real address. */
export function LegacyHash() {
  const router = useRouter();
  useEffect(() => {
    const m = /^#\/(a|c|search)\/(.+)$/.exec(window.location.hash);
    if (!m) return;
    const id = decodeURIComponent(m[2]);
    router.replace(m[1] === "search" ? `/help/search?q=${encodeURIComponent(id)}` : `/help/${m[1]}/${encodeURIComponent(id)}`);
  }, [router]);
  return null;
}

/** The article text, with click-to-enlarge screenshots and walkthrough videos that play while on screen. */
export function ArticleBody({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ src: string; opener: HTMLElement } | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const set = (v: HTMLVideoElement, on: boolean) => {
      const b = v.parentElement?.querySelector<HTMLElement>(".vplay");
      if (!b) return;
      if (on) { v.play()?.catch(() => {}); b.classList.add("on"); b.innerHTML = "&#10074;&#10074;"; b.setAttribute("aria-label", "Pause walkthrough"); }
      else { v.pause(); b.classList.remove("on"); b.innerHTML = "&#9654;"; b.setAttribute("aria-label", "Play walkthrough"); }
    };
    const vids = [...root.querySelectorAll<HTMLVideoElement>(".vbox video")];
    let io: IntersectionObserver | null = null;
    if (vids.length && !reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target as HTMLVideoElement; if (!v.dataset.user) set(v, e.isIntersecting && e.intersectionRatio >= 0.5); }), { threshold: [0, 0.5] });
      vids.forEach((v) => io!.observe(v));
    }
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const z = t.closest<HTMLElement>("[data-zoom]");
      if (z) { setZoom({ src: z.getAttribute("data-zoom")!, opener: z }); return; }
      const p = t.closest<HTMLElement>(".vplay") ?? (t.tagName === "VIDEO" && t.closest(".vbox") ? t : null);
      if (p) {
        const v = p.tagName === "VIDEO" ? (p as HTMLVideoElement) : p.parentElement!.querySelector("video")!;
        v.dataset.user = "1";
        set(v, v.paused);
      }
    };
    root.addEventListener("click", click);
    return () => { root.removeEventListener("click", click); io?.disconnect(); };
  }, [html]);

  useEffect(() => {
    if (!zoom) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const close = () => { zoom.opener.focus(); setZoom(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [zoom]);

  return (
    <>
      <div ref={ref} className="body" dangerouslySetInnerHTML={{ __html: html }} />
      {zoom ? (
        <div className="lb" role="dialog" aria-label="Enlarged screenshot" onClick={() => { zoom.opener.focus(); setZoom(null); }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt="" />
          <button type="button" aria-label="Close" autoFocus>&times;</button>
        </div>
      ) : null}
    </>
  );
}

const FB_KEY = "smehub.help.fb";

/** "Was this article helpful?" The answer is kept in this browser only. */
export function Feedback({ id }: { id: string }) {
  const [f, setF] = useState<string | null>(null);
  useEffect(() => {
    try { setF((JSON.parse(localStorage.getItem(FB_KEY) || "{}") as Record<string, string>)[id] ?? null); } catch { setF(null); }
  }, [id]);
  const pick = (v: string) => {
    try { const all = JSON.parse(localStorage.getItem(FB_KEY) || "{}"); all[id] = v; localStorage.setItem(FB_KEY, JSON.stringify(all)); } catch {}
    setF(v);
  };
  return (
    <div className="fb" aria-live="polite">
      {f ? (
        <>
          <span>Thanks for your feedback.</span>
          <span className="muted">{f === "no" ? <>We’ll use it to improve this article. Need help now? <Link href="/help/a/contact-support">Contact us</Link>.</> : "Glad it helped."}</span>
        </>
      ) : (
        <>
          <span>Was this article helpful?</span>
          <button type="button" aria-pressed="false" onClick={() => pick("yes")}>Yes</button>
          <button type="button" aria-pressed="false" onClick={() => pick("no")}>No</button>
        </>
      )}
    </div>
  );
}
