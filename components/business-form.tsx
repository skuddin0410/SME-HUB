"use client";

import { useActionState } from "react";
import { saveBusiness, type BizState } from "@/app/(hub)/business-actions";
import { SubmitButton } from "@/components/hub-client";
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
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <label className="grid gap-1.5 text-sm font-semibold">
        Business name
        <input name="name" required maxLength={100} defaultValue={values.name} className="field font-normal" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">
          Category
          <select name="category" required defaultValue={values.category ?? ""} className="field font-normal">
            <option value="">Choose a category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          How customers find you
          <select name="kind" defaultValue={values.kind ?? "storefront"} className="field font-normal">
            {Object.entries(KINDS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          City
          <input name="city" required maxLength={80} defaultValue={values.city} className="field font-normal" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Province
          <select name="province" required defaultValue={values.province ?? ""} className="field font-normal">
            <option value="">Choose</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold">
        What the business does
        <textarea name="description" rows={3} maxLength={1000} defaultValue={values.description} className="field font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Website
        <input name="website" maxLength={200} placeholder="yourbusiness.ca" defaultValue={values.website} className="field font-normal" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">
          Logo
          <input type="file" accept="image/*" className="text-sm font-normal" onChange={(e) => logo.pick(e.target.files?.[0])} />
          {logo.busy && <span className="text-xs font-normal text-muted-foreground">Uploading…</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo.url && <img src={logo.url} alt="Logo preview" className="h-16 w-16 rounded border object-contain" />}
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Cover photo
          <input type="file" accept="image/*" className="text-sm font-normal" onChange={(e) => cover.pick(e.target.files?.[0])} />
          {cover.busy && <span className="text-xs font-normal text-muted-foreground">Uploading…</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover.url && <img src={cover.url} alt="Cover preview" className="h-16 w-full rounded border object-cover" />}
        </label>
      </div>
      <input type="hidden" name="logo_url" value={logo.url} />
      <input type="hidden" name="cover_url" value={cover.url} />
      {(logo.error || cover.error) && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{logo.error || cover.error}</p>}
      <Notice state={state} />
      <SubmitButton className="self-start" disabled={logo.busy || cover.busy}>
        {values.id ? "Save changes" : "Create page"}
      </SubmitButton>
    </form>
  );
}
