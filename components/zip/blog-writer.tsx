"use client";
/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useState } from "react";
import { saveBlog, type BlogState } from "@/app/(hub)/blog-actions";
import { useImageUpload } from "@/lib/upload";
import { BKINDS, type BlockKind, type BlogBlock } from "@/lib/zip/member-blogs";

type Initial = { id: string | null; title: string; cat: string; tags: string; image: string | null; blocks: BlogBlock[] };
type Blk = { k: BlockKind; v: string };

/** One picture inside a post, uploaded by the member. */
function ImageBlock({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const up = useImageUpload("cover", value || null);
  return (
    <div className="stack" style={{ gap: 8, flex: 1 }}>
      <label className="btn sm ghost" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
        {up.preview ? "Change picture" : "Add a picture"}
        <input type="file" accept="image/*" className="sr" aria-label={label} onChange={async (e) => { await up.pick(e.target.files?.[0]); }} />
      </label>
      {up.busy && <span className="muted small" role="status">Uploading…</span>}
      {up.error && <span className="small errtxt" role="alert">{up.error}</span>}
      {up.preview && <img src={up.preview} alt="" style={{ maxHeight: 180, borderRadius: 10, objectFit: "cover" }} />}
      {up.url && up.url !== value && <Sync url={up.url} onChange={onChange} />}
    </div>
  );
}
function Sync({ url, onChange }: { url: string; onChange: (u: string) => void }) {
  // hand the finished upload's address to the editor
  useEffect(() => { onChange(url); }, [url, onChange]);
  return null;
}

export function BlogWriter({ initial, cats, memberTags, reqImg, needsApproval }: { initial: Initial; cats: string[]; memberTags: boolean; reqImg: boolean; needsApproval: boolean }) {
  const [state, action, pending] = useActionState<BlogState, FormData>(saveBlog, {});
  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState<Blk[]>(initial.blocks.length ? initial.blocks.map(([k, v]) => ({ k, v })) : [{ k: "p", v: "" }]);
  const [cat, setCat] = useState(initial.cat);
  const [tags, setTags] = useState(initial.tags);
  const [when, setWhen] = useState("now");
  const feat = useImageUpload("cover", initial.image);
  const [offset] = useState(() => new Date().getTimezoneOffset());
  const set = (i: number, v: string) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, v } : x)));
  const submitLabel = needsApproval ? "Submit for approval" : when === "schedule" ? "Schedule post" : "Publish";
  const missingImage = reqImg && !feat.preview;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={initial.id ?? ""} />
      <input type="hidden" name="blocks" value={JSON.stringify(blocks.map((b) => [b.k, b.v]))} />
      <input type="hidden" name="image_url" value={feat.url} />
      {initial.image && !feat.url && <input type="hidden" name="keep_image" value="1" />}
      <input type="hidden" name="tz_offset" value={offset} />
      <div className="edwrap">
        <section className="card" style={{ gap: 14, padding: 28 }}>
          <label className="sr" htmlFor="edt">Post title</label>
          <input id="edt" name="title" className="edtitle" placeholder="Give your post a title" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          {blocks.map((b, i) => (
            <div className="edblock" key={i}>
              <span className="kind">{BKINDS[b.k]}</span>
              {b.k === "img" ? <ImageBlock value={b.v} onChange={(u) => set(i, u)} label={`Picture for block ${i + 1}`} /> : (
                <textarea className={b.k} aria-label={BKINDS[b.k]} rows={b.k === "h" ? 1 : b.k === "ul" ? 4 : 3} maxLength={5000} value={b.v} onChange={(e) => set(i, e.target.value)}
                  placeholder={b.k === "h" ? "Heading" : b.k === "ul" ? "One point per line" : b.k === "q" ? "A quote worth pulling out" : "Write here"} />
              )}
              <span className="ctl">
                {i > 0 && <button type="button" className="xbtn" aria-label="Move block up" onClick={() => setBlocks((l) => { const c = [...l]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}>↑</button>}
                {blocks.length > 1 && <button type="button" className="xbtn" aria-label="Remove block" onClick={() => setBlocks((l) => l.filter((_, j) => j !== i))}>×</button>}
              </span>
            </div>
          ))}
          <div className="addbar">
            <span className="small" style={{ fontWeight: 600 }}>Add a block:</span>
            {(Object.keys(BKINDS) as BlockKind[]).map((k) => <button key={k} type="button" className="chip" onClick={() => setBlocks((l) => [...l, { k, v: "" }])}>+ {BKINDS[k]}</button>)}
          </div>
        </section>
        <aside className="stack" style={{ gap: 16 }}>
          <div className="card">
            <h2>Publish</h2>
            <label htmlFor="edw" className="small" style={{ fontWeight: 600 }}>When
              <select id="edw" name="when" className="field" value={when} onChange={(e) => setWhen(e.target.value)}>
                <option value="now">Publish now</option><option value="schedule">Schedule</option>
              </select>
            </label>
            {when === "schedule" && (
              <div className="row">
                <label className="grow small" htmlFor="edd">Date<input id="edd" name="date" className="field" type="date" required /></label>
                <label className="grow small" htmlFor="edtm">Time<input id="edtm" name="time" className="field" type="time" defaultValue="09:00" /></label>
              </div>
            )}
            {needsApproval && <p className="muted small">On your plan, the Hub team reviews posts before they go live. Most are approved within one business day.</p>}
            {state.error && <p role="alert" className="small errtxt">{state.error}</p>}
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button type="submit" name="mode" value="publish" className="btn" disabled={pending || feat.busy}>{submitLabel}</button>
              <button type="submit" name="mode" value="draft" className="btn ghost" formNoValidate disabled={pending || feat.busy}>Save draft</button>
            </div>
          </div>
          <div className="card">
            <h2>Category <span className="muted small" style={{ fontWeight: 400 }}>(required)</span></h2>
            <label className="sr" htmlFor="edc">Category</label>
            <select id="edc" name="cat" className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Choose one</option>{cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            {memberTags && (
              <>
                <label htmlFor="edg" className="small" style={{ fontWeight: 600 }}>Tags<input id="edg" name="tags" className="field" placeholder="e.g. cash flow, hiring" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
                <span className="muted small">Separate tags with commas.</span>
              </>
            )}
          </div>
          <div className="card">
            <h2>Featured image{reqImg && <span className="muted small" style={{ fontWeight: 400 }}> (required)</span>}</h2>
            <label className="btn sm ghost" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
              {feat.preview ? "Change image" : "Add an image"}
              <input type="file" accept="image/*" className="sr" aria-label="Featured image" onChange={(e) => feat.pick(e.target.files?.[0])} />
            </label>
            {feat.busy && <span className="muted small" role="status">Uploading…</span>}
            {feat.error && <span className="small errtxt" role="alert">{feat.error}</span>}
            {feat.preview && <img src={feat.preview} alt="" style={{ borderRadius: 10, aspectRatio: "16/9", objectFit: "cover", width: "100%" }} />}
            {missingImage && <span className="small errtxt">A featured image is required.</span>}
          </div>
        </aside>
      </div>
    </form>
  );
}
