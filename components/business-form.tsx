"use client";

import { useActionState } from "react";
import { saveBusiness, type FormState } from "@/app/(hub)/actions";
import { SubmitButton } from "@/components/hub-client";
import { useImageUpload } from "@/lib/upload";

export const CATEGORIES = [
  "Business Consulting", "Coaching", "Construction", "Digital Marketing", "Education", "Fashion & Clothing", "Finance",
  "Food & Drink", "Health & Wellness", "IT", "Law", "Logistics", "Manufacturing", "Non-profit", "Real Estate", "Retail",
  "Technology", "Travel & Hospitality", "Other",
];

export type BusinessValues = { id?: string; name?: string; category?: string; description?: string; website?: string };

export function BusinessForm({ values = {} }: { values?: BusinessValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveBusiness, {});
  const logo = useImageUpload("logo");
  return (
    <form action={action} className="flex flex-col gap-4">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <label className="grid gap-1.5 text-sm font-semibold">
        Business name
        <input name="name" required maxLength={100} defaultValue={values.name} className="field font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Category
        <select name="category" defaultValue={values.category ?? ""} className="field font-normal">
          <option value="">Choose a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        What the business does
        <textarea name="description" rows={4} maxLength={1000} defaultValue={values.description} className="field font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Website
        <input name="website" maxLength={200} placeholder="yourbusiness.ca" defaultValue={values.website} className="field font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Logo
        {/* no name: the file itself is never sent with the form, only the uploaded address below */}
        <input type="file" accept="image/*" className="text-sm font-normal" onChange={(e) => logo.pick(e.target.files?.[0])} />
        {logo.busy && <span className="text-xs font-normal text-muted-foreground">Uploading…</span>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo.url && <img src={logo.url} alt="Logo preview" className="h-16 w-16 rounded border object-contain" />}
      </label>
      <input type="hidden" name="logo_url" value={logo.url} />
      {logo.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{logo.error}</p>}
      {state.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>}
      <SubmitButton className="self-start" disabled={logo.busy}>
        {values.id ? "Save changes" : "Add listing"}
      </SubmitButton>
    </form>
  );
}
