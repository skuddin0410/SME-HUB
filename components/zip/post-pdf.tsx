"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Ic } from "@/components/zip/ic";
import { pdfSize } from "@/lib/upload";
import type { PostPdf } from "@/lib/hub";

/** Long file names keep their start and their end, as in the design. */
export function pdfShort(n: string) {
  return n.length > 48 ? `${n.slice(0, 30)}…${n.slice(-14)}` : n;
}

/** Update 26: the PDF card (red PDF icon, name, size and pages). In the post and edit windows it carries Replace and ×. */
export function PdfCard({ pdf, children }: { pdf: { name: string; size: number; pages?: number | null; url?: string }; children?: React.ReactNode }) {
  const pages = pdf.pages ?? 0;
  return (
    <div className="pdcard">
      <span className="pdico" aria-hidden="true">PDF</span>
      <span className="pdinfo">
        <b title={pdf.name}>{pdfShort(pdf.name)}</b>
        <small>PDF document · {pdfSize(pdf.size)}{pages ? ` · ${pages} page${pages > 1 ? "s" : ""}` : ""}</small>
      </span>
      {children ?? (pdf.url && (
        <>
          <a className="btn sm ghost" href={pdf.url} target="_blank" rel="noopener">
            <Ic n="ext" s={14} />Open
          </a>
          <a className="btn sm ghost pddl" href={`${pdf.url}?dl=1`} download={pdf.name} aria-label={`Download ${pdf.name}`}>
            <Ic n="dl" s={14} /><span>Download</span>
          </a>
        </>
      ))}
    </div>
  );
}

// ---------- Update 27: the viewer ----------
// PDF.js 3.11.174 (Mozilla, Apache 2.0) is loaded the first time a post with a PDF appears, from /vendor/pdfjs.
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};
type PdfLib = { getDocument: (o: { url: string; isEvalSupported: boolean }) => { promise: Promise<PdfDoc> }; GlobalWorkerOptions: { workerSrc: string } };

const LIB_SRC = "/vendor/pdfjs/pdf.min.js";
const WORKER_SRC = "/vendor/pdfjs/pdf.worker.min.js";
let libPromise: Promise<PdfLib> | null = null;
const docs = new Map<string, Promise<PdfDoc>>();
const pages = new Map<string, { src: string; r: number }>();
const waiting = new Set<string>();
const counts = new Map<string, number>();
const failed = new Set<string>();
const subs = new Set<() => void>();
let version = 0;
const bump = () => {
  version++;
  subs.forEach((f) => f());
};

function loadLib(): Promise<PdfLib> {
  const w = window as unknown as { pdfjsLib?: PdfLib };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = LIB_SRC;
      sc.async = true;
      sc.onload = () => {
        if (!w.pdfjsLib) return reject(new Error("no pdf.js"));
        w.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        resolve(w.pdfjsLib);
      };
      sc.onerror = () => {
        libPromise = null;
        reject(new Error("pdf.js did not load"));
      };
      document.head.appendChild(sc);
    });
  }
  return libPromise;
}

function loadDoc(url: string): Promise<PdfDoc> {
  let d = docs.get(url);
  if (!d) {
    // eval stays off: PDF.js then never runs code found inside a PDF's fonts
    d = loadLib().then((L) => L.getDocument({ url, isEvalSupported: false }).promise);
    d.then(
      (doc) => {
        counts.set(url, doc.numPages);
        bump();
      },
      () => {
        failed.add(url);
        bump();
      },
    );
    docs.set(url, d);
  }
  return d;
}

const key = (url: string, n: number) => `${url}#${n}`;

/** Each page is drawn once at 1400 px wide as a JPEG and reused. */
function renderPage(url: string, n: number) {
  const k = key(url, n);
  if (pages.has(k) || waiting.has(k) || failed.has(url)) return;
  waiting.add(k);
  loadDoc(url)
    .then(async (doc) => {
      if (n > doc.numPages) return;
      const pg = await doc.getPage(n);
      const v0 = pg.getViewport({ scale: 1 });
      const v = pg.getViewport({ scale: 1400 / v0.width });
      const cv = document.createElement("canvas");
      cv.width = Math.round(v.width);
      cv.height = Math.round(v.height);
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: ctx, viewport: v }).promise;
      pages.set(k, { src: cv.toDataURL("image/jpeg", 0.86), r: v.height / v.width });
    })
    .catch(() => failed.add(url))
    .finally(() => {
      waiting.delete(k);
      bump();
    });
}

function useStore() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => version,
    () => 0,
  );
}

function Box({ pdf, n, total, full, onGo, onFull }: { pdf: PostPdf; n: number; total: number; full: boolean; onGo: (d: number) => void; onFull?: () => void }) {
  const c = pages.get(key(pdf.url, n));
  const first = pages.get(key(pdf.url, 1));
  const ar = c ? 1 / c.r : first ? 1 / first.r : 0.7727;
  const err = failed.has(pdf.url);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const title = pdf.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
  return (
    <div className={`pvbox${full ? " full" : ""}${err ? " pverr" : ""}`}>
      {!full && (
        <div className="pvhead">
          <span className="pvt" title={pdf.name}>{title}</span>
          <span className="pvm">{total || "…"} pages</span>
        </div>
      )}
      <div
        className={`pvstage${c ? " ready" : ""}${full ? " pvfs" : ""}`}
        style={full ? undefined : { aspectRatio: ar.toFixed(4) }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.changedTouches[0].clientX - t.x;
          const dy = e.changedTouches[0].clientY - t.y;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) onGo(dx < 0 ? 1 : -1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={`Page ${n} of ${pdf.name}`} src={c?.src} />
        <span className="pvload" aria-hidden="true"><span />Loading page…</span>
        <span className="pverrmsg">This PDF can’t be shown here. Use Download to open it.</span>
        <button type="button" className="pvnav l" aria-label="Previous page" disabled={n <= 1} onClick={() => onGo(-1)}><Ic n="cl" s={22} /></button>
        <button type="button" className="pvnav r" aria-label="Next page" disabled={!!total && n >= total} onClick={() => onGo(1)}><Ic n="cr" s={22} /></button>
      </div>
      <div className="pvbar">
        <span className="pvcount" aria-live="polite">{n} / {total || "…"}</span>
        <span className="pvprog" aria-hidden="true"><span style={{ width: `${total ? ((n / total) * 100).toFixed(1) : 0}%` }} /></span>
        <a className="pvbtn" href={`${pdf.url}?dl=1`} download={pdf.name} aria-label={`Download ${pdf.name}`} title="Download"><Ic n="dl" s={17} /></a>
        {onFull && <button type="button" className="pvbtn" aria-label="View full screen" title="Full screen" onClick={onFull}><Ic n="expand" s={17} /></button>}
      </div>
    </div>
  );
}

/** The PDF inside a post: title and pages, the page large, arrows, swipe, a progress bar, Download and Full screen. */
export function PdfViewer({ pdf, sharedBy }: { pdf: PostPdf; sharedBy: string }) {
  useStore();
  const [n, setN] = useState(1);
  const [full, setFull] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const total = counts.get(pdf.url) ?? pdf.pages ?? 0;

  // start loading only when the post comes near the screen, so a long feed stays light
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setNear(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setNear(true), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!near) return;
    renderPage(pdf.url, n);
    if (!total || n < total) renderPage(pdf.url, n + 1);
  }, [near, n, total, pdf.url]);

  const go = useCallback(
    (d: number) => setN((cur) => {
      const t = counts.get(pdf.url) ?? pdf.pages ?? 1;
      const x = cur + d;
      return x < 1 || x > t ? cur : x;
    }),
    [pdf.url, pdf.pages],
  );

  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [full, go]);

  return (
    <div ref={boxRef}>
      <Box pdf={pdf} n={n} total={total} full={false} onGo={go} onFull={() => setFull(true)} />
      {full && (
        <div className="overlay pvov" onClick={() => setFull(false)}>
          <div className="pvfwrap" role="dialog" aria-modal="true" aria-labelledby={`pvt-${pdf.url}`} onClick={(e) => e.stopPropagation()}>
            <div className="pvfhead">
              <div className="stack" style={{ gap: 0, minWidth: 0 }}>
                <b id={`pvt-${pdf.url}`} className="pvt">{pdf.name}</b>
                <span className="small">Shared by {sharedBy}</span>
              </div>
              <button type="button" className="pvx" aria-label="Close full screen" autoFocus onClick={() => setFull(false)}><Ic n="x" s={20} /></button>
            </div>
            <Box pdf={pdf} n={n} total={total} full onGo={go} />
          </div>
        </div>
      )}
    </div>
  );
}
