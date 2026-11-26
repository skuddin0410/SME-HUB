"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components/zip/ic";
import { ZipAv } from "@/components/zip/bits";
import { PdfCard } from "@/components/zip/post-pdf";
import { editPost } from "@/app/(hub)/actions";
import { POST_MEDIA, uploadImage, uploadPdf } from "@/lib/upload";
import { FEED } from "@/lib/feed-rules";
import { KINDS, type Kind } from "@/lib/demo";
import type { PostPdf } from "@/lib/hub";

const TYPE_ICON: Record<string, string> = { update: "doc", question: "help", win: "trophy", offer: "tag", hiring: "brief", intro: "hand" };

/** Opens a post's edit window from its "…" menu. */
export function openEditPost(postId: string) {
  window.dispatchEvent(new CustomEvent("zip:edit-post", { detail: postId }));
}

type Photo = { key: string; url: string; preview: string; busy: boolean };
type Pdf = { name: string; size: number; pages?: number | null; url?: string; path?: string; busy?: boolean };

/**
 * Update 26: the edit window matches the post window. The author can change the type, title and text, remove photos
 * or add up to 10 in all, and add, replace or remove the PDF. The video stays as it is. Typing is kept while files upload.
 */
export function EditPostWindow({
  post, me, free, titleRule,
}: {
  post: { id: string; kind: string; title: string; body: string; images: string[]; image_url: string | null; video_url: string | null; pdf: PostPdf | null };
  me: { full_name: string | null; avatar_url: string | null };
  free: boolean;
  titleRule: "optional" | "required" | "off";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(post.kind);
  const [title, setTitle] = useState(post.title);
  const [body, setBody] = useState(post.body);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [pdfChanged, setPdfChanged] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pid = post.id.slice(0, 8);

  // each opening starts from the post as it is now
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== post.id) return;
      opener.current = document.activeElement as HTMLElement | null;
      const list = post.images.length ? post.images : post.image_url ? [post.image_url] : [];
      setKind(post.kind);
      setTitle(post.title);
      setBody(post.body);
      setPhotos(list.map((u) => ({ key: u, url: u, preview: u, busy: false })));
      setPdf(post.pdf);
      setPdfChanged(false);
      setNote("");
      setOpen(true);
    };
    window.addEventListener("zip:edit-post", on);
    return () => window.removeEventListener("zip:edit-post", on);
  }, [post]);

  const close = () => {
    setOpen(false);
    setTimeout(() => opener.current?.focus(), 0);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  const addPhotos = (files: FileList | null) => {
    const all = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!all.length) return;
    const room = POST_MEDIA.photos - photos.length;
    const ok = all.filter((f) => f.size <= POST_MEDIA.photoMB * 1024 * 1024);
    const msgs: string[] = [];
    if (ok.length > room) msgs.push(`A post can have up to ${POST_MEDIA.photos} photos. We added the first ${Math.max(0, room)}.`);
    if (ok.length < all.length) msgs.push(`Photos can be up to ${POST_MEDIA.photoMB} MB each.`);
    setNote(msgs.join(" "));
    const added = ok.slice(0, Math.max(0, room)).map((f) => ({ key: crypto.randomUUID(), preview: URL.createObjectURL(f), url: "", busy: true, file: f }));
    setPhotos((cur) => [...cur, ...added.map(({ key, preview, url, busy }) => ({ key, preview, url, busy }))]);
    for (const a of added) {
      uploadImage(a.file, "post")
        .then((url) => setPhotos((cur) => cur.map((p) => (p.key === a.key ? { ...p, url, busy: false } : p))))
        .catch((e) => {
          setPhotos((cur) => cur.filter((p) => p.key !== a.key));
          setNote(e instanceof Error ? e.message : "A photo did not upload. Try again.");
        });
    }
  };
  const addPdf = async (file: File | undefined) => {
    if (!file) return;
    setNote("");
    const before = pdf;
    setPdf({ name: file.name, size: file.size, busy: true });
    try {
      const up = await uploadPdf(file);
      setPdf({ name: up.name, size: up.size, path: up.path });
      setPdfChanged(true);
    } catch (e) {
      setPdf(before);
      setNote(e instanceof Error ? e.message : "The PDF did not upload. Try again.");
    }
  };

  const busy = photos.some((p) => p.busy) || !!pdf?.busy;
  const empty = !body.trim() && !photos.length && !pdf && !post.video_url;
  const save = async () => {
    if (busy || saving) return;
    if (empty) { setNote("A post cannot be empty."); return; }
    if (titleRule === "required" && !title.trim()) { setNote("Add a title to your post."); return; }
    setSaving(true);
    try {
      const r = await editPost(post.id, {
        kind, title, body,
        images: photos.map((p) => p.url).filter(Boolean),
        pdf: !pdfChanged ? "keep" : pdf?.path ? { path: pdf.path, name: pdf.name } : null,
      });
      if (r.error) setNote(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setNote("Could not save your changes. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const kinds = (["update", "question", "win", "hiring", "intro"] as string[]).concat(free && post.kind !== "offer" ? [] : ["offer"]);
  const keyClick = (ref: React.RefObject<HTMLInputElement | null>) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); }
  };

  return (
    <div className="overlay" onClick={close}>
      <div className="modal cpm" role="dialog" aria-modal="true" aria-labelledby={`ept-${pid}`} onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column" }}>
        <div className="cph">
          <ZipAv name={me.full_name || "Member"} src={me.avatar_url} />
          <div className="stack" style={{ gap: 1, minWidth: 0 }}>
            <b id={`ept-${pid}`}>Edit your post</b>
            <span className="small muted">Your changes will show an “Edited” label.</span>
          </div>
          <button type="button" className="cpx" aria-label="Close" onClick={close}><Ic n="x" s={18} /></button>
        </div>

        <div className="cptypes" role="group" aria-label="Post type">
          {kinds.map((k) => (
            <button key={k} type="button" className="cpt" aria-pressed={kind === k} onClick={() => setKind(k)}>
              <Ic n={TYPE_ICON[k]} s={15} />{KINDS[k as Kind]?.label ?? k}
            </button>
          ))}
        </div>

        {titleRule !== "off" && (
          <>
            <label className="sr" htmlFor={`ept-t-${pid}`}>Post title</label>
            <input className="cptitle" id={`ept-t-${pid}`} maxLength={FEED.titleMax} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={titleRule === "required" ? "Title" : "Title (optional)"} />
          </>
        )}
        <label className="sr" htmlFor={`ept-x-${pid}`}>Post</label>
        <textarea className="cpta" id={`ept-x-${pid}`} maxLength={5000} value={body} autoFocus onChange={(e) => setBody(e.target.value)} />

        <div className="cpmedia">
          {photos.length > 0 && (
            <div className="cpthumbs">
              {photos.map((p, i) => (
                <div key={p.key} className="cpth">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt={`Photo ${i + 1}`} style={p.busy ? { opacity: 0.6 } : undefined} />
                  <button type="button" className="cpthx" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((cur) => cur.filter((x) => x.key !== p.key))}><Ic n="x" s={14} /></button>
                </div>
              ))}
              {photos.length < POST_MEDIA.photos && (
                <label htmlFor={`epphotos-${pid}`} className="cpth cpadd" tabIndex={0} onKeyDown={keyClick(photoRef)}>
                  <Ic n="plus" s={18} /><span className="small">Add</span>
                </label>
              )}
            </div>
          )}
          {post.video_url && <p className="small muted"><Ic n="video" s={14} /> The video stays as it is.</p>}
          {pdf && (
            <PdfCard pdf={pdf}>
              {pdf.busy ? <span className="small muted">Uploading…</span> : (
                <>
                  <label htmlFor={`eppdf-${pid}`} className="btn sm ghost" tabIndex={0} onKeyDown={keyClick(pdfRef)}>Replace</label>
                  <button type="button" className="cpx" aria-label="Remove PDF" onClick={() => { setPdf(null); setPdfChanged(true); }}><Ic n="x" s={16} /></button>
                </>
              )}
            </PdfCard>
          )}
        </div>
        {note && <p className="small" role="alert" style={{ color: "var(--err, #B91C1C)", padding: "0 20px" }}>{note}</p>}

        <div className="cpf">
          <input ref={photoRef} className="sr" type="file" id={`epphotos-${pid}`} accept="image/*" multiple tabIndex={-1} aria-hidden="true"
            onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
          {photos.length < POST_MEDIA.photos && (
            <label htmlFor={`epphotos-${pid}`} className="cpi" title="Add photos" aria-label="Add photos" tabIndex={0} onKeyDown={keyClick(photoRef)}>
              <Ic n="img" s={18} /><span>Photo</span>
            </label>
          )}
          <input ref={pdfRef} className="sr" type="file" id={`eppdf-${pid}`} accept="application/pdf,.pdf" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { void addPdf(e.target.files?.[0]); e.target.value = ""; }} />
          <label htmlFor={`eppdf-${pid}`} className="cpi" title={pdf ? "Replace the PDF" : "Add a PDF"} aria-label={pdf ? "Replace the PDF" : "Add a PDF, up to 25 MB"} tabIndex={0} onKeyDown={keyClick(pdfRef)}>
            <Ic n="pdf" s={18} /><span>{pdf ? "Replace PDF" : "PDF"}</span>
          </label>
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={close}>Cancel</button>
          <button type="button" className="btn" disabled={busy || saving} onClick={save}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}
