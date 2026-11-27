"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Ic } from "@/components/zip/ic";
import { BizCardView } from "@/components/zip/biz-card";
import { toast } from "@/components/toast";
import { saveCard, type CardPatch } from "@/app/(hub)/card-actions";
import { CARD_FIELDS, CARD_STYLES, cardBg, cardLink, cardUrl, type CardData, type CardField, type CardStyle } from "@/lib/business-card";
import { cardPdf, cardPng, download } from "@/lib/card-draw";

/**
 * Update 31: My business card. The live card and its 4 actions on the left; style, what to show and who can see
 * it on the right. Every choice saves straight away. Phone, email and website are off until the member turns them on.
 */
export type StudioInit = {
  handle: string;
  name: string;
  avatar: string | null;
  style: CardStyle;
  show: Record<CardField, boolean>;
  own: { title: string; phone: string; email: string; website: string };
  profile: Record<CardField, string>;
  stats: { opens: number; saves: number };
};

const COL: Record<CardField, keyof CardPatch> = { title: "show_title", business: "show_business", city: "show_city", phone: "show_phone", email: "show_email", website: "show_website" };
const EDITABLE: ("title" | "phone" | "email" | "website")[] = ["title", "phone", "email", "website"];

export function CardStudio({ init, qr, qrBig }: { init: StudioInit; qr: string; qrBig: string }) {
  const [style, setStyle] = useState<CardStyle>(init.style);
  const [show, setShow] = useState(init.show);
  const [own, setOwn] = useState(init.own);
  const [editing, setEditing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [busy, setBusy] = useState<"" | "png" | "pdf">("");

  const val = (k: CardField) => (k in own ? (own as Record<string, string>)[k]?.trim() : "") || init.profile[k] || "";
  const data: CardData = {
    handle: init.handle,
    name: init.name,
    avatar: init.avatar,
    style,
    ...Object.fromEntries(CARD_FIELDS.filter(([k]) => show[k] && val(k)).map(([k]) => [k, val(k)])),
  };
  const slug = init.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my";

  const save = async (patch: CardPatch, undo: () => void, ok?: string) => {
    const r = await saveCard(patch).catch(() => ({ ok: false as const, error: "Could not save that. Check your connection and try again." }));
    if (!r.ok) {
      undo();
      toast(r.error);
    } else if (ok) toast(ok);
  };
  const pickStyle = (s: CardStyle) => {
    if (s === style) return;
    const was = style;
    setStyle(s);
    save({ style: s }, () => setStyle(was), `${CARD_STYLES[s].n} style saved`);
  };
  const flip = (k: CardField) => {
    const next = !show[k];
    setShow((v) => ({ ...v, [k]: next }));
    save({ [COL[k]]: next } as CardPatch, () => setShow((v) => ({ ...v, [k]: !next })));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cardUrl(init.handle, "link"));
      toast(`Link copied: ${cardLink(init.handle)}`);
    } catch {
      toast(`Your link: ${cardLink(init.handle)}`);
    }
  };
  const png = async () => {
    setBusy("png");
    try {
      download(await cardPng(data), `${slug}-business-card.png`);
      toast(`Downloaded ${slug}-business-card.png`);
    } catch {
      toast("The image didn’t download. Try again.");
    } finally {
      setBusy("");
    }
  };
  const pdf = async () => {
    setBusy("pdf");
    try {
      download(await cardPdf(data), `${slug}-business-card-print.pdf`);
      toast("Downloaded your print-ready PDF");
    } catch {
      toast("The PDF didn’t download. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="bcpage">
      <div className="bchead">
        <div>
          <h1>My business card</h1>
          <p className="muted">One card for SME Hub on the web and in the app. People scan the code to see your card and save your contact.</p>
        </div>
        <Link className="btn ghost sm" href={`/c/${init.handle}`}><Ic n="eye" s={14} />See what people see</Link>
      </div>
      <div className="bcgrid">
        <div className="bcleft">
          <BizCardView d={data} qr={qr} cls="big" />
          <div className="bcacts">
            <button type="button" className="btn dark" onClick={copy}><Ic n="copy" s={14} />Copy my link</button>
            <button type="button" className="btn ghost" onClick={() => setQrOpen(true)}><Ic n="qr" s={14} />Show QR code</button>
            <button type="button" className="btn ghost" onClick={png} disabled={!!busy}><Ic n="dl" s={14} />{busy === "png" ? "Making…" : "Save image"}</button>
            <button type="button" className="btn ghost" onClick={pdf} disabled={!!busy}><Ic n="print" s={14} />{busy === "pdf" ? "Making…" : "Print-ready PDF"}</button>
          </div>
          <p className="small muted bcfine">The PDF is a standard 3.5 × 2 inch card with the bleed any print shop needs: your details on the front, your code on the back.</p>
        </div>
        <div className="bcright">
          <section className="card bcsec">
            <h2>1. Choose a style</h2>
            <div className="bcsts">
              {(Object.keys(CARD_STYLES) as CardStyle[]).map((k) => {
                const t = CARD_STYLES[k];
                return (
                  <button key={k} type="button" className={`bcst${style === k ? " on" : ""}`} aria-pressed={style === k} onClick={() => pickStyle(k)}>
                    <span className="bcsti" style={{ background: cardBg(t) }}>
                      {t.stripe && <i style={{ background: t.acc }} />}
                      <b style={{ background: t.acc }} />
                    </span>
                    {t.n}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="card bcsec">
            <h2>2. Choose what to show</h2>
            <p className="small muted">Your name, photo and code are always on the card. Phone and email stay off until you turn them on.</p>
            <div className="bcsws">
              {CARD_FIELDS.map(([k, label]) => {
                const v = val(k);
                return (
                  <button key={k} type="button" className="bcsw" role="switch" aria-checked={show[k]} onClick={() => flip(k)}>
                    <span><b>{label}</b><small className={v ? "" : "empty"}>{v || (k === "business" ? "Add a business page first" : "Not added yet")}</small></span>
                    <i />
                  </button>
                );
              })}
            </div>
            {editing ? (
              <OwnValues
                own={own}
                profile={init.profile}
                onDone={async (next) => {
                  const was = own;
                  setOwn(next);
                  setEditing(false);
                  await save({ title: next.title, phone: next.phone, email: next.email, website: next.website }, () => setOwn(was), "Card details saved");
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <button type="button" className="linkbtn small" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5 }} onClick={() => setEditing(true)}>
                <Ic n="edit" s={13} /> Change the title, phone, email or website on your card
              </button>
            )}
          </section>
          <section className="card bcsec bcwho">
            <h2>Who can see it</h2>
            <ul className="small">
              <li>Anyone who scans your code or opens your link sees only what you switch on here.</li>
              <li>Your card page is not listed in search engines. You can change this in <Link href="/settings">Settings and privacy</Link>.</li>
              <li>When someone saves your card and messages you, they show up in <Link href="/leads">My leads</Link>.</li>
            </ul>
            <p className="bcstats"><Ic n="chart" s={14} />Your card was opened <b>{init.stats.opens}</b> {init.stats.opens === 1 ? "time" : "times"} this month, <b>{init.stats.saves}</b> {init.stats.saves === 1 ? "person" : "people"} saved your contact.</p>
          </section>
        </div>
      </div>
      {qrOpen && <QrModal name={init.name} handle={init.handle} qr={qrBig} onClose={() => setQrOpen(false)} />}
    </div>
  );
}

function OwnValues({ own, profile, onDone, onCancel }: { own: StudioInit["own"]; profile: StudioInit["profile"]; onDone: (v: StudioInit["own"]) => void; onCancel: () => void }) {
  const [v, setV] = useState(own);
  const [err, setErr] = useState("");
  const LABEL = { title: "Title", phone: "Phone", email: "Email", website: "Website" } as const;
  return (
    <form
      className="bcvals"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.phone.trim() && !/^[0-9+()\-. ]{7,25}$/.test(v.phone.trim())) return setErr("That phone number doesn’t look right.");
        if (v.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) return setErr("That email doesn’t look right.");
        onDone(v);
      }}
    >
      {EDITABLE.map((k) => (
        <label key={k}>
          {LABEL[k]}
          <input
            className="field"
            type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
            value={v[k]}
            maxLength={k === "email" ? 254 : k === "website" ? 200 : k === "phone" ? 25 : 80}
            placeholder={profile[k] ? `From your profile: ${profile[k]}` : "Leave blank to use your profile"}
            onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))}
          />
        </label>
      ))}
      <small className="muted">Only for your card. Leave a box blank to use what’s on your profile.</small>
      {err && <p className="hderr" role="alert">{err}</p>}
      <div className="row" style={{ gap: 6 }}>
        <button type="submit" className="btn sm dark">Save</button>
        <button type="button" className="btn sm ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function QrModal({ name, handle, qr, onClose }: { name: string; handle: string; qr: string; onClose: () => void }) {
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    done.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const root = (document.querySelector(".zip") as HTMLElement | null) ?? document.body;
  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal bcqm" role="dialog" aria-modal="true" aria-labelledby="bcqt" onClick={(e) => e.stopPropagation()}>
        <h2 id="bcqt">Scan to see my card</h2>
        <div className="bcqbig" dangerouslySetInnerHTML={{ __html: qr }} />
        <b>{name}</b>
        <span className="small muted">{cardLink(handle)}</span>
        <p className="small muted">Hold up your screen so the other person can scan it with their phone camera. No app needed.</p>
        <button ref={done} type="button" className="btn dark" onClick={onClose}>Done</button>
      </div>
    </div>,
    root,
  );
}
