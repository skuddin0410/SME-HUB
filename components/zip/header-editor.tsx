"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { removeHeader, saveHeader } from "@/app/(hub)/header-actions";
import { HEADER_COLOURS, headerColourSrc, headerSrc, type HeaderCrop, type MemberHeader } from "@/lib/header";
import { uploadBlob, uploadImage } from "@/lib/upload";
import { toast } from "@/components/toast";

/**
 * Update 39: "Edit your header". Every member (Free, Plus, Advisor) can use a photo (drag, zoom and move to choose the
 * part to show) or one of 8 colours, or go back to the original header. The photo is cropped to 1584 x 396 in the
 * browser, which also drops location data, and both the crop and the original are stored in our own storage.
 */
const W = 1584;
const H = 396;
const MAX = 8 * 1024 * 1024;

type Me = { name: string; headline: string | null; avatar: string | null };
type Draft = { mode: "photo" | "colour"; col: number; img: string | null; w: number; h: number; x: number; y: number; z: number; err: string; warn: string };

function layout(d: Draft): React.CSSProperties {
  if (!d.img) return {};
  const s = Math.max(W / d.w, H / d.h) * d.z;
  return { backgroundImage: `url(${d.img})`, backgroundSize: `${((d.w * s) / W) * 100}% auto`, backgroundPosition: `${d.x}% ${d.y}%` };
}

function bake(d: Draft): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous"; // the saved original comes from our storage, which allows this
    im.onload = () => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d");
      if (!g) return reject(new Error("no canvas"));
      const s = Math.max(W / d.w, H / d.h) * d.z;
      const dw = d.w * s;
      const dh = d.h * s;
      g.drawImage(im, ((W - dw) * d.x) / 100, ((H - dh) * d.y) / 100, dw, dh);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("no image"))), "image/jpeg", 0.85);
    };
    im.onerror = () => reject(new Error("no image"));
    im.src = d.img!;
  });
}

/** The 4:1 header strip on a profile: the member's photo or colour, or the standard header. */
export function headerStyle(h: MemberHeader | null | undefined): React.CSSProperties | null {
  const src = headerSrc(h);
  return src ? { backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center" } : null;
}

export function HeaderEditor({ me, current, onClose }: { me: Me; current: MemberHeader; onClose: () => void }) {
  const router = useRouter();
  const saved = current.header_url ? "photo" : current.header_colour != null ? "colour" : null;
  const [d, setD] = useState<Draft>({ mode: saved === "colour" ? "colour" : "photo", col: current.header_colour ?? 0, img: null, w: 0, h: 0, x: 50, y: 50, z: 1, err: "", warn: "" });
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const prev = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; w: number; h: number } | null>(null);
  const root = typeof document !== "undefined" ? (document.querySelector(".zip") as HTMLElement | null) ?? document.body : null;

  // re-crop: open the saved original with the saved position
  useEffect(() => {
    if (saved !== "photo" || !current.header_src) return;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      const crop = (current.header_crop ?? { x: 50, y: 50, z: 1 }) as HeaderCrop;
      setD((v) => (v.img ? v : { ...v, img: current.header_src!, w: im.naturalWidth, h: im.naturalHeight, x: crop.x, y: crop.y, z: crop.z }));
    };
    im.src = current.header_src;
  }, [saved, current.header_src, current.header_crop]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = o;
    };
  }, [busy, onClose]);

  const read = (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setD((v) => ({ ...v, err: "Please choose a JPG, PNG or WebP photo.", warn: "" }));
    if (f.size > MAX) return setD((v) => ({ ...v, err: "That photo is over 8 MB. Please choose a smaller one.", warn: "" }));
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      const warn =
        im.naturalWidth < 1000
          ? `This photo is quite small (${im.naturalWidth} pixels wide), so it may look blurry. 1584 pixels wide is best.`
          : im.naturalWidth / im.naturalHeight < 1.2
            ? "Tall photos get cropped a lot. Use the sliders to choose the part to show."
            : "";
      setFile(f);
      setD((v) => ({ ...v, mode: "photo", img: url, w: im.naturalWidth, h: im.naturalHeight, x: 50, y: 50, z: 1, err: "", warn }));
    };
    im.onerror = () => setD((v) => ({ ...v, err: "We couldn’t open that photo. Please try another.", warn: "" }));
    im.src = url;
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (d.mode !== "photo" || !d.img) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: d.x, oy: d.y, w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g) return;
    const s = Math.max(W / d.w, H / d.h) * d.z;
    const ex = ((d.w * s) / W) * g.w - g.w;
    const ey = ((d.h * s) / H) * g.h - g.h;
    setD((v) => ({
      ...v,
      x: ex > 1 ? Math.max(0, Math.min(100, g.ox - ((e.clientX - g.x) / ex) * 100)) : v.x,
      y: ey > 1 ? Math.max(0, Math.min(100, g.oy - ((e.clientY - g.y) / ey) * 100)) : v.y,
    }));
  };

  const save = useCallback(async () => {
    setBusy(true);
    try {
      let r;
      if (d.mode === "colour") r = await saveHeader({ kind: "colour", colour: d.col });
      else if (d.img) {
        const crop = await bake(d);
        const [url, src] = await Promise.all([uploadBlob(crop, "header"), file ? uploadImage(file, "header") : Promise.resolve(current.header_src!)]);
        r = await saveHeader({ kind: "photo", url, src, crop: { x: d.x, y: d.y, z: d.z } });
      } else return onClose();
      if (!r.ok) return setD((v) => ({ ...v, err: r.error }));
      onClose();
      router.refresh();
      toast("Your new header is on your profile");
    } catch (e) {
      setD((v) => ({ ...v, err: e instanceof Error ? e.message : "Could not save your header. Try again." }));
    } finally {
      setBusy(false);
    }
  }, [d, file, current.header_src, onClose, router]);

  const reset = async () => {
    setBusy(true);
    const r = await removeHeader().catch(() => ({ ok: false as const, error: "Could not change your header. Try again." }));
    setBusy(false);
    if (!r.ok) return setD((v) => ({ ...v, err: r.error }));
    onClose();
    router.refresh();
    toast("Your original header is back");
  };

  const photo = d.mode === "photo";
  const previewStyle: React.CSSProperties = !photo
    ? { backgroundImage: `url("${headerColourSrc(d.col)}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : d.img
      ? layout(d)
      : (headerStyle(current) ?? {});
  const canSave = !busy && (!photo || !!d.img);
  if (!root) return null;

  return createPortal(
    <div className="overlay" onClick={() => !busy && onClose()}>
      <div className="modal hdmodal" role="dialog" aria-modal="true" aria-labelledby="hdt" onClick={(e) => e.stopPropagation()}>
        <div className="hdtop">
          <div>
            <h2 id="hdt">Edit your header</h2>
            <p>The wide image at the top of your profile. Everyone on SME Hub can see it.</p>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Close" disabled={busy}><Ic n="x" s={18} /></button>
        </div>
        <div className="hdstage">
          <div
            ref={prev}
            className={`hdprev${photo && d.img ? " drag" : ""}`}
            style={previewStyle}
            role="img"
            aria-label={photo && d.img ? "Header preview. Drag to move the photo." : "Header preview"}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            {photo && d.img && <span className="hdhint"><Ic n="move" s={13} />Drag to move</span>}
          </div>
          <div className="hdme">
            <span className="av hero">
              {me.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.avatar} alt="" />
              ) : (
                <span className="hdini">{(me.name || "M").slice(0, 1).toUpperCase()}</span>
              )}
            </span>
            <span><b>{me.name}</b>{me.headline && <small>{me.headline}</small>}</span>
          </div>
        </div>
        <div className="hdseg" role="tablist" aria-label="Header type">
          <button type="button" role="tab" aria-selected={photo} onClick={() => setD((v) => ({ ...v, mode: "photo", err: "" }))}><Ic n="img" s={15} />Use a photo</button>
          <button type="button" role="tab" aria-selected={!photo} onClick={() => setD((v) => ({ ...v, mode: "colour", err: "" }))}><Ic n="palette" s={15} />Use a colour</button>
        </div>
        {photo ? (
          <div className="hdbody">
            <div className="hdpick">
              <label className="btn ghost hdfile">
                <Ic n="upl" s={15} />
                {d.img ? "Choose a different photo" : "Choose a photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => read(e.target.files?.[0])} />
              </label>
              <span className="hdsize">Best size 1584 × 396 pixels. JPG, PNG or WebP, up to 8 MB.</span>
            </div>
            {d.warn && <p className="hdwarn"><Ic n="alert" s={14} />{d.warn}</p>}
            {d.err && <p className="hderr" role="alert">{d.err}</p>}
            {d.img ? (
              <>
                <div className="hdsl">
                  <label htmlFor="hdz">Zoom</label>
                  <input type="range" id="hdz" min={1} max={2.5} step={0.01} value={d.z} onChange={(e) => setD((v) => ({ ...v, z: +e.target.value }))} />
                </div>
                <div className="hdsl">
                  <label htmlFor="hdy">Move up or down</label>
                  <input type="range" id="hdy" min={0} max={100} step={1} value={d.y} onChange={(e) => setD((v) => ({ ...v, y: +e.target.value }))} />
                </div>
                {d.z > 1 && (
                  <div className="hdsl">
                    <label htmlFor="hdx">Move left or right</label>
                    <input type="range" id="hdx" min={0} max={100} step={1} value={d.x} onChange={(e) => setD((v) => ({ ...v, x: +e.target.value }))} />
                  </div>
                )}
              </>
            ) : (
              <ul className="hdtips">
                <li>Show your work: your shop, your product, your team or your town.</li>
                <li>Leave out text, logos and phone numbers. The edges are trimmed on phones.</li>
              </ul>
            )}
          </div>
        ) : (
          <div className="hdbody">
            <div className="hdcols" role="radiogroup" aria-label="Colour">
              {HEADER_COLOURS.map((c, i) => (
                <button key={c[0]} type="button" role="radio" aria-checked={d.col === i} onClick={() => setD((v) => ({ ...v, col: i }))} style={{ background: `linear-gradient(135deg,${c[1]},${c[2]})` }}>
                  <span>{c[0]}</span>
                </button>
              ))}
            </div>
            {d.err && <p className="hderr" role="alert">{d.err}</p>}
          </div>
        )}
        <div className="hdfoot">
          {saved ? (
            <button type="button" className="linkbtn hdrm" onClick={reset} disabled={busy}>Go back to the original header</button>
          ) : (
            <span className="hdnote">Headers must follow the <Link href="/policies/community-guidelines">community guidelines</Link>.</span>
          )}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn dark" onClick={save} disabled={!canSave}>{busy ? "Saving…" : "Save header"}</button>
        </div>
      </div>
    </div>,
    root,
  );
}

/** The "Edit header" button in the top-right corner of the member's own header (just the camera on phones). */
export function EditHeaderButton({ me, current }: { me: Me; current: MemberHeader }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="hdedit" onClick={() => setOpen(true)} aria-label="Edit your header image">
        <Ic n="camera" s={15} />
        <span>Edit header</span>
      </button>
      {open && <HeaderEditor me={me} current={current} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The "Header image" row in Edit profile. */
export function HeaderRow({ me, current }: { me: Me; current: MemberHeader }) {
  const [open, setOpen] = useState(false);
  const st = headerStyle(current);
  return (
    <div className="hdrow">
      <span className="hdthumb" style={st ?? undefined} />
      <span className="grow"><b>Header image</b><small>The wide image at the top of your profile</small></span>
      <button type="button" className="btn sm ghost" onClick={() => setOpen(true)}><Ic n="camera" s={14} />Change</button>
      {open && <HeaderEditor me={me} current={current} onClose={() => setOpen(false)} />}
    </div>
  );
}
