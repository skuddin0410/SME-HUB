"use client";

import { useActionState } from "react";
import { saveBusiness, type BizState } from "@/app/(hub)/business-actions";
import { ZipSubmit } from "@/components/zip/submit";
import { useImageUpload } from "@/lib/upload";
import { KINDS } from "@/lib/business";
import { PROVINCES } from "@/lib/profile-extra";

export type BusinessValues = {
  id?: string;
  name?: string;
  kind?: string;
  category?: string;
  city?: string;
  province?: string;
  description?: string;
  website?: string;
};

export function Notice({ state }: { state: BizState }) {
  if (state.error) return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>;
  return null;
}

/** Five quick details to start a page; everything else lives on the manage screen. */
export function BusinessForm({ values = {}, categories }: { values?: BusinessValues; categories: string[] }) {
  const [state, action] = useActionState<BizState, FormData>(saveBusiness, {});
  const logo = useImageUpload("logo");
  const cover = useImageUpload("cover");
  return (
    <form action={action} className="card bzform">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <label>
        Business name
        <input name="name" required maxLength={100} defaultValue={values.name} className="field" placeholder="For example: Golden Crust Bakery" />
      </label>
      <div className="bz2col">
        <label>
          Category
          <select name="category" required defaultValue={values.category ?? ""} className="field">
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          How customers reach you
          <select name="kind" defaultValue={values.kind ?? "storefront"} className="field">
            {Object.entries(KINDS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        What the business does
        <textarea name="description" rows={3} maxLength={1000} defaultValue={values.description} className="field" placeholder="What you do and for whom" />
      </label>
      <div className="bz2col">
        <label>
          City
          <input name="city" required maxLength={80} defaultValue={values.city} className="field" placeholder="Mississauga" />
        </label>
        <label>
          Province or territory
          <select name="province" required defaultValue={values.province ?? ""} className="field">
            <option value="">Choose</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Website
        <input name="website" maxLength={200} placeholder="yourbusiness.ca" defaultValue={values.website} className="field" />
      </label>
      <div className="bz2col">
        <label>
          Logo
          <input type="file" accept="image/*" onChange={(e) => logo.pick(e.target.files?.[0])} />
          {logo.busy && <span className="muted small">Uploading…</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo.url && <img src={logo.url} alt="Logo preview" style={{ height: 64, width: 64, borderRadius: 10, objectFit: "contain", border: "1px solid var(--line)" }} />}
        </label>
        <label>
          Cover photo
          <input type="file" accept="image/*" onChange={(e) => cover.pick(e.target.files?.[0])} />
          {cover.busy && <span className="muted small">Uploading…</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover.url && <img src={cover.url} alt="Cover preview" style={{ height: 64, width: "100%", borderRadius: 10, objectFit: "cover", border: "1px solid var(--line)" }} />}
        </label>
      </div>
      <input type="hidden" name="logo_url" value={logo.url} />
      <input type="hidden" name="cover_url" value={cover.url} />
      {(logo.error || cover.error) && <p className="small sterr" role="alert">{logo.error || cover.error}</p>}
      {state.error && <p role="alert" className="small sterr">{state.error}</p>}
      {state.ok && <p role="status" className="small" style={{ color: "#15803D" }}>Saved.</p>}
      <p className="muted small">{values.id ? "" : "You choose later whether your street address is shown."}</p>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {values.id ? (
          <ZipSubmit disabled={logo.busy || cover.busy}>Save changes</ZipSubmit>
        ) : (
          <>
            <ZipSubmit className="btn ghost" name="then" value="preview" disabled={logo.busy || cover.busy}>Save draft and preview</ZipSubmit>
            <ZipSubmit disabled={logo.busy || cover.busy}>Save draft and add more details</ZipSubmit>
          </>
        )}
      </div>
    </form>
  );
}
