"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { FsCard, FsTabs, useFs } from "@/components/forsale/ui";
import { publishListing } from "@/app/(hub)/forsale-actions";
import { checkDraft, draftCard, FS_INC, FS_IND, FS_MAX_PHOTO, FS_PHOTOS, FS_RE, FS_TYPE, PROVS, type Draft, type DraftErr, type Premises, type SaleType } from "@/lib/forsale-shared";

/** Sell your business / Edit a listing (screens 07, 08, 14). */
export function SellForm({ initial, tabs }: { initial: Draft; tabs: { mine: number; unread: number; saved: number } }) {
  const x = useFs();
  const router = useRouter();
  const [D, setD] = useState<Draft>(initial);
  const [E, setE] = useState<DraftErr>({});
  const [up, setUp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = !!initial.id;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((o) => ({ ...o, [k]: v }));
    if (E[k]) setE((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const errs = Object.keys(E) as (keyof Draft)[];

  const fld = (k: keyof Draft, lab: string, hint: string, type: "text" | "num" | "ta", ph = "") => {
    const err = E[k];
    return (
      <label className={`fsfl${err ? " bad" : ""}`} htmlFor={`fsd-${k}`}>
        <span>{lab}</span>
        {hint && <small className="muted">{hint}</small>}
        {type === "ta" ? (
          <textarea className="field fsta" id={`fsd-${k}`} rows={5} placeholder={ph} value={String(D[k])} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!err || undefined} />
        ) : (
          <input className="field" id={`fsd-${k}`} type="text" inputMode={type === "num" ? "numeric" : "text"} value={String(D[k])} placeholder={ph} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!err || undefined} />
        )}
        {err && <span className="fserr">{err}</span>}
      </label>
    );
  };
  const sel = (k: keyof Draft, lab: string, opts: [string, string][]) => (
    <label className={`fsfl${E[k] ? " bad" : ""}`} htmlFor={`fsd-${k}`}>
      <span>{lab}</span>
      <select className="field" id={`fsd-${k}`} value={String(D[k])} onChange={(e) => set(k, e.target.value as never)} aria-invalid={!!E[k] || undefined}>
        {opts.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
      {E[k] && <span className="fserr">{E[k]}</span>}
    </label>
  );
  const chk = (k: "por" | "fin" | "conf", lab: string, hint: string) => (
    <label className="fschk">
      <input type="checkbox" checked={D[k]} onChange={(e) => set(k, e.target.checked)} />
      <span><b>{lab}</b>{hint && <small className="muted">{hint}</small>}</span>
    </label>
  );

  const upload = async (f: File) => {
    if (f.size > FS_MAX_PHOTO) return x.toast("That photo is over 8 MB. Choose a smaller one.");
    setUp(true);
    try {
      const body = new FormData();
      body.append("file", await shrink(f));
      const r = await fetch("/api/sale-photo", { method: "POST", body });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) return x.toast(j.error ?? "Upload failed. Try again.");
      set("photo", j.url);
    } catch {
      x.toast("Upload failed. Try again.");
    } finally {
      setUp(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publish = async () => {
    const e = checkDraft(D);
    setE(e);
    const n = Object.keys(e).length;
    if (n) {
      x.toast(`Fix ${n} thing${n === 1 ? "" : "s"} first`);
      setTimeout(() => (document.querySelector(".fsfl.bad input,.fsfl.bad textarea,.fsfl.bad select") as HTMLElement | null)?.focus(), 50);
      return;
    }
    const r = await x.run(() => publishListing(D));
    if (!r) return;
    if (r.err && Object.keys(r.err).length) return setE(r.err);
    if (r.error || !r.slug) return x.toast(r.error ?? "Something went wrong. Try again.");
    x.toast(editing ? "Changes saved" : "Your listing is live. The Hub team will check it within 2 working days.");
    router.push(`/for-sale/${r.slug}`);
    router.refresh();
  };

  const photos = FS_PHOTOS.concat(D.photo && !FS_PHOTOS.includes(D.photo) ? [D.photo] : []);
  return (
    <>
      <FsTabs a="mysales" {...tabs} />
      <div className="pagehead">
        <p className="eyebrow">{editing ? "Edit listing" : "Sell your business"}</p>
        <h1>{editing ? "Edit your listing" : "List your business for sale"}</h1>
        <p className="muted" style={{ maxWidth: 720 }}>Takes about 10 minutes. Your listing goes live straight away, and the Hub team checks every new listing within 2 working days.</p>
      </div>
      {errs.length > 0 && (
        <div className="card fswarn" role="alert">
          <b>{errs.length} thing{errs.length === 1 ? "" : "s"} to fix</b>
          <span className="small">{errs.map((k) => E[k]).join(" ")}</span>
        </div>
      )}
      <div className="fsform">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <section className="card fsfs">
            <h2>1. The basics</h2>
            {fld("title", "Headline", "Say what the business is and where. Leave out the business name if you want to stay confidential.", "text", "Example: Established bakery-café in Toronto’s west end")}
            <div className="fs2">
              {sel("ind", "Industry", [["", "Pick one"], ...FS_IND.map((v) => [v, v] as [string, string])])}
              {sel("type", "Type of sale", (Object.keys(FS_TYPE) as SaleType[]).map((k) => [k, FS_TYPE[k]]))}
            </div>
            <div className="fs2">
              {fld("city", "City", "", "text", "Toronto")}
              {sel("prov", "Province or territory", PROVS)}
            </div>
            {fld("area", "Area shown to buyers", "Optional. A neighbourhood or region, so buyers can’t pin down your exact address.", "text", "West end, Toronto")}
          </section>
          <section className="card fsfs">
            <h2>2. Price and numbers</h2>
            <p className="small muted">Only signed-in members see sales and earnings. Use last year’s figures, rounded is fine.</p>
            <div className="fs2">
              {fld("price", "Asking price (CAD)", "", "num", "485,000")}
              <div className="fsfl"><span>&nbsp;</span>{chk("por", "Price on request", "Not recommended. Listings with a price get about twice the enquiries.")}</div>
            </div>
            <div className="fs2">
              {fld("rev", "Yearly sales (CAD)", "", "num", "920,000")}
              {fld("cf", "Owner earnings a year (CAD)", "Profit before the owner’s pay, interest and tax.", "num", "168,000")}
            </div>
            <div className="fs2">
              {fld("est", "Year established", "", "num", "2011")}
              {fld("staff", "Employees", "Not counting you.", "num", "9")}
            </div>
            {chk("fin", "I’m open to seller financing", "The buyer pays part of the price in payments over time. This brings in more buyers.")}
          </section>
          <section className="card fsfs">
            <h2>3. About the business</h2>
            {fld("desc", "Description", "What you do, who your customers are and why the business does well. Leave a blank line between paragraphs.", "ta", "A well-loved neighbourhood bakery-café with a loyal morning crowd…")}
            {fld("hl", "Highlights", "One per line. Up to 5.", "ta", "Wholesale accounts with 6 local cafés\nFully equipped kitchen, replaced in 2022")}
            {fld("reason", "Why you’re selling", "Buyers always ask. A clear reason builds trust.", "text", "Retiring after 14 years")}
            {fld("buyer", "Ideal buyer", "Optional.", "text", "An owner-operator with retail experience")}
          </section>
          <section className="card fsfs">
            <h2>4. What’s included</h2>
            <div className="fsincs">
              {FS_INC.map((t, i) => (
                <label key={t} className="fschk">
                  <input type="checkbox" checked={D.inc.includes(i)} onChange={(e) => set("inc", e.target.checked ? [...D.inc, i].sort((a, b) => a - b) : D.inc.filter((v) => v !== i))} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            <div className="fs2">
              {sel("re", "Premises", (Object.keys(FS_RE) as Premises[]).map((k) => [k, FS_RE[k]]))}
              {fld("reLeft", "Lease details", "Optional.", "text", "7 years left, with an option to renew")}
            </div>
            {fld("train", "Training and handover", "How long you’ll stay to help the new owner.", "text", "I’ll stay for 3 months")}
            {fld("docs", "Documents you can share", "One per line. Shared only with buyers you choose.", "ta", "Financial statements for the last 3 years")}
          </section>
          <section className="card fsfs">
            <h2>5. Photo and privacy</h2>
            <span className="small" style={{ fontWeight: 600 }}>Main photo</span>
            <div className="fsphs">
              {photos.map((p) => (
                <button key={p} type="button" className="fsph" aria-pressed={D.photo === p} aria-label="Use this photo" onClick={() => set("photo", p)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" />
                </button>
              ))}
              <label className="fsph fsup" htmlFor="fsphoto">
                <Ic n="upl" s={20} /><span className="small">{up ? "Uploading…" : "Upload"}</span>
                <input ref={fileRef} id="fsphoto" type="file" accept="image/*" className="sr" disabled={up} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
            <span className="small muted">Use a photo of the space, products or work. Avoid your shop sign if you want to stay confidential.</span>
            {chk("conf", "Keep my name and business name hidden", "Buyers see “Confidential seller” until you share documents with them.")}
            {!D.conf && fld("biz", "Business name shown to buyers", "", "text", "Maple Bakery")}
          </section>
          <div className="row fssubmit">
            <button type="button" className="btn" onClick={publish} disabled={x.busy || up}>{editing ? "Save changes" : "Publish listing"}</button>
            <Link className="btn ghost" href={editing ? "/for-sale/my-listings" : "/for-sale"}>Cancel</Link>
          </div>
        </div>
        <aside className="fsprev">
          <span className="eyebrow">Preview</span>
          <FsCard l={draftCard(D)} prev />
          <div className="card fstips">
            <h2 style={{ fontSize: 15 }}>Tips for a strong listing</h2>
            <ul className="fsul small">
              <li><Ic n="check" s={14} /><span>Show a price. Listings without one get far fewer enquiries.</span></li>
              <li><Ic n="check" s={14} /><span>Talk to an accountant about the value before you list.</span></li>
              <li><Ic n="check" s={14} /><span>Tell your landlord early if the lease needs to transfer.</span></li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

/** Large phone photos are scaled down to 1600 px wide before upload; the server resizes and cleans every photo again. */
async function shrink(f: File): Promise<Blob> {
  try {
    const bm = await createImageBitmap(f, { imageOrientation: "from-image" });
    if (bm.width <= 1600 && f.size < 4 * 1024 * 1024) {
      bm.close();
      return f;
    }
    const s = Math.min(1, 1600 / bm.width);
    const cv = document.createElement("canvas");
    cv.width = Math.round(bm.width * s);
    cv.height = Math.round(bm.height * s);
    cv.getContext("2d")!.drawImage(bm, 0, 0, cv.width, cv.height);
    bm.close();
    return await new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/jpeg", 0.9));
  } catch {
    return f;
  }
}
