"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTeamMember, claimBusiness, replyInquiry, saveBusinessDetails, saveBusinessSettings, saveEvent, saveJob, savePhoto, saveProduct, saveService, sendInquiry, type BizState } from "@/app/(hub)/business-actions";
import { SubmitButton } from "@/components/hub-client";
import { Notice } from "@/components/business-form";
import { ACTIONS, DAYS, DAY_LABEL, PRICE_TYPES, ROLES, SOCIALS, type BusinessSettings, type Hours } from "@/lib/business";
import { useImageUpload } from "@/lib/upload";

const label = "grid gap-1.5 text-sm font-semibold";
const check = "flex items-center gap-2 text-sm";

export type DetailsValues = {
  id: string;
  about: string;
  tz: string;
  service_area: string;
  show_address: boolean;
  show_email: boolean;
  show_phone: boolean;
  show_whatsapp: boolean;
  booking_url: string;
  primary_action: string;
  appointments: boolean;
  hours: Hours;
  closures: { date: string }[];
  social: Record<string, string>;
  street: string;
  postal: string;
  email: string;
  phone: string;
  whatsapp: string;
};

/** Hours, contact details with a show/hide switch for each, and the main button on the page. */
export function DetailsForm({ v }: { v: DetailsValues }) {
  const [state, action] = useActionState<BizState, FormData>(saveBusinessDetails, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={v.id} />
      <label className={label}>
        About
        <textarea name="about" rows={4} maxLength={2000} defaultValue={v.about} className="field font-normal" />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Opening hours</legend>
        {DAYS.map((d) => (
          <div key={d} className="grid grid-cols-[6.5rem_1fr_1fr] items-center gap-2 text-sm">
            <span>{DAY_LABEL[d]}</span>
            <input type="time" name={`${d}_open`} defaultValue={v.hours[d]?.[0]?.[0] ?? ""} aria-label={`${DAY_LABEL[d]} opens`} className="field" />
            <input type="time" name={`${d}_close`} defaultValue={v.hours[d]?.[0]?.[1] ?? ""} aria-label={`${DAY_LABEL[d]} closes`} className="field" />
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Leave a day blank to show it as closed.</p>
        <label className={label}>
          Closed on these dates (YYYY-MM-DD, separated by spaces)
          <input name="closures" defaultValue={v.closures.map((c) => c.date).join(" ")} className="field font-normal" />
        </label>
        <label className={label}>
          Time zone
          <input name="tz" defaultValue={v.tz} className="field font-normal" />
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Contact details (choose what the public sees)</legend>
        <label className={label}>
          Street address
          <input name="street" maxLength={120} defaultValue={v.street} className="field font-normal" />
        </label>
        <label className={label}>
          Postal code
          <input name="postal" maxLength={10} defaultValue={v.postal} className="field font-normal" />
        </label>
        <label className={check}>
          <input type="checkbox" name="show_address" defaultChecked={v.show_address} /> Show address
        </label>
        <span />
        <label className={label}>
          Email
          <input name="email" type="email" maxLength={120} defaultValue={v.email} className="field font-normal" />
        </label>
        <label className={label}>
          Phone
          <input name="phone" maxLength={30} defaultValue={v.phone} className="field font-normal" />
        </label>
        <label className={check}>
          <input type="checkbox" name="show_email" defaultChecked={v.show_email} /> Show email
        </label>
        <label className={check}>
          <input type="checkbox" name="show_phone" defaultChecked={v.show_phone} /> Show phone
        </label>
        <label className={label}>
          WhatsApp
          <input name="whatsapp" maxLength={30} defaultValue={v.whatsapp} className="field font-normal" />
        </label>
        <label className={check}>
          <input type="checkbox" name="show_whatsapp" defaultChecked={v.show_whatsapp} /> Show WhatsApp
        </label>
        <label className={`${label} sm:col-span-2`}>
          Area you serve
          <input name="service_area" maxLength={120} placeholder="Greater Toronto Area" defaultValue={v.service_area} className="field font-normal" />
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold">Main button and links</legend>
        <label className={label}>
          Main button
          <select name="primary_action" defaultValue={v.primary_action} className="field font-normal">
            {Object.entries(ACTIONS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Booking link
          <input name="booking_url" maxLength={200} defaultValue={v.booking_url} className="field font-normal" />
        </label>
        <label className={`${check} sm:col-span-2`}>
          <input type="checkbox" name="appointments" defaultChecked={v.appointments} /> By appointment
        </label>
        {SOCIALS.map((s) => (
          <label key={s} className={label}>
            <span className="capitalize">{s}</span>
            <input name={`social_${s}`} maxLength={200} defaultValue={v.social[s] ?? ""} className="field font-normal" />
          </label>
        ))}
      </fieldset>
      <Notice state={state} />
      <SubmitButton className="self-start">Save details</SubmitButton>
    </form>
  );
}

export function ServiceForm({ companyId, service }: { companyId: string; service?: { id: string; name: string; description: string; price_type: string; price: number | null } }) {
  const [state, action] = useActionState<BizState, FormData>(saveService, {});
  const photo = useImageUpload("post");
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        if (!service) ref.current?.reset();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="company_id" value={companyId} />
      {service && <input type="hidden" name="id" value={service.id} />}
      <label className={label}>
        Service
        <input name="name" required maxLength={80} defaultValue={service?.name} className="field font-normal" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Pricing
          <select name="price_type" defaultValue={service?.price_type ?? "quote"} className="field font-normal">
            {Object.entries(PRICE_TYPES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Price (CAD)
          <input name="price" inputMode="decimal" defaultValue={service?.price ?? ""} className="field font-normal" />
        </label>
      </div>
      <label className={`${label} sm:col-span-2`}>
        Short description
        <input name="description" maxLength={300} defaultValue={service?.description} className="field font-normal" />
      </label>
      <label className={label}>
        Photo (optional)
        <input type="file" accept="image/*" className="text-sm font-normal" onChange={(e) => photo.pick(e.target.files?.[0])} />
      </label>
      <input type="hidden" name="photo_url" value={photo.url} />
      <div className="flex items-end gap-3">
        <SubmitButton disabled={photo.busy}>{service ? "Save service" : "Add service"}</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function TeamAdd({ companyId, candidates }: { companyId: string; candidates: { id: string; full_name: string }[] }) {
  const [state, action] = useActionState<BizState, FormData>(addTeamMember, {});
  if (candidates.length === 0) return <p className="text-sm text-muted-foreground">Connect with members first, then you can add them here.</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="company_id" value={companyId} />
      <label className={label}>
        Connection
        <select name="member" required className="field font-normal">
          <option value="">Choose a person</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Role
        <select name="role" defaultValue="editor" className="field font-normal">
          {Object.entries(ROLES)
            .filter(([k]) => k !== "owner")
            .map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
        </select>
      </label>
      <SubmitButton>Add to team</SubmitButton>
      <Notice state={state} />
    </form>
  );
}

export function InquiryForm({ companyId, quote }: { companyId: string; quote?: boolean }) {
  const [state, action] = useActionState<BizState, FormData>(sendInquiry, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="kind" value={quote ? "quote" : "message"} />
      <label className={label}>
        {quote ? "What do you need a quote for?" : "Your message"}
        <textarea name="body" required rows={3} maxLength={2000} className="field font-normal" />
      </label>
      <Notice state={state} />
      <SubmitButton className="self-start">{quote ? "Request a quote" : "Send message"}</SubmitButton>
    </form>
  );
}

export function ReplyForm({ inquiryId }: { inquiryId: string }) {
  const [state, action] = useActionState<BizState, FormData>(replyInquiry, {});
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        ref.current?.reset();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="inquiry_id" value={inquiryId} />
      <textarea name="body" required rows={2} maxLength={2000} aria-label="Your reply" className="field" />
      <Notice state={state} />
      <SubmitButton className="self-start">Reply</SubmitButton>
    </form>
  );
}

export function ClaimForm({ companyId }: { companyId: string }) {
  const [state, action] = useActionState<BizState, FormData>(claimBusiness, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="company_id" value={companyId} />
      <label className={label}>
        How are you connected to this business?
        <textarea name="evidence" required minLength={10} rows={3} maxLength={1000} className="field font-normal" />
      </label>
      {state.ok ? <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Sent. The team will review your claim.</p> : <Notice state={state} />}
      <SubmitButton className="self-start">Send claim</SubmitButton>
    </form>
  );
}

/** Staff only: how the directory behaves for everyone. */
export function SettingsForm({ s }: { s: BusinessSettings }) {
  const [state, action] = useActionState<BizState, FormData>(saveBusinessSettings, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Who can create pages
          <select name="create_mode" defaultValue={s.create_mode} className="field font-normal">
            <option value="all">Every active member</option>
            <option value="paid">Paid plans only</option>
          </select>
        </label>
        <label className={label}>
          Pages per member
          <input name="member_limit" type="number" min={0} max={50} defaultValue={s.member_limit} className="field font-normal" />
        </label>
      </div>
      <label className={check}>
        <input type="checkbox" name="pub_approval" defaultChecked={s.pub_approval} /> New pages need team approval before they go live
      </label>
      <label className={check}>
        <input type="checkbox" name="review_approval" defaultChecked={s.review_approval} /> Reviews need team approval before they show
      </label>
      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1 text-sm font-semibold">Tabs on a business page</legend>
        {(["photos", "events", "jobs", "shop"] as const).map((t) => (
          <label key={t} className={check}>
            <input type="checkbox" name={`tab_${t}`} defaultChecked={s.tabs[t]} /> <span className="capitalize">{t}</span>
          </label>
        ))}
      </fieldset>
      <label className={label}>
        Categories (one per line)
        <textarea name="categories" rows={8} defaultValue={s.categories.join("\n")} className="field font-normal" />
      </label>
      <label className={label}>
        Review criteria (one per line, up to 6)
        <textarea name="criteria" rows={3} defaultValue={s.criteria.join("\n")} className="field font-normal" />
      </label>
      <Notice state={state} />
      <SubmitButton className="self-start">Save settings</SubmitButton>
    </form>
  );
}

/** Runs the form action, then clears the form once it saved (for "add another" forms). */
function useAddForm(action: (fd: FormData) => void | Promise<void>, state: BizState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return { ref, action };
}

export function PhotoForm({ companyId }: { companyId: string }) {
  const [state, action] = useActionState<BizState, FormData>(savePhoto, {});
  const photo = useImageUpload("post");
  const f = useAddForm(action, state);
  return (
    <form ref={f.ref} action={f.action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="url" value={photo.url} />
      <label className={label}>
        Photo
        <input type="file" accept="image/*" required className="text-sm font-normal" onChange={(e) => photo.pick(e.target.files?.[0])} />
        {photo.busy && <span className="text-xs font-normal text-muted-foreground">Uploading…</span>}
      </label>
      <label className={label}>
        Caption (optional)
        <input name="caption" maxLength={140} className="field font-normal" />
      </label>
      {photo.error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{photo.error}</p>}
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton disabled={photo.busy || !photo.url}>Add photo</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function ProductForm({ companyId }: { companyId: string }) {
  const [state, action] = useActionState<BizState, FormData>(saveProduct, {});
  const photo = useImageUpload("post");
  const f = useAddForm(action, state);
  return (
    <form ref={f.ref} action={f.action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="photo_url" value={photo.url} />
      <label className={label}>
        Product
        <input name="name" required maxLength={80} className="field font-normal" />
      </label>
      <label className={label}>
        Price (CAD)
        <input name="price" required inputMode="decimal" className="field font-normal" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Short description
        <input name="description" maxLength={300} className="field font-normal" />
      </label>
      <label className={label}>
        Photo (optional)
        <input type="file" accept="image/*" className="text-sm font-normal" onChange={(e) => photo.pick(e.target.files?.[0])} />
      </label>
      <label className={`${check} self-end`}>
        <input type="checkbox" name="sold_out" /> Sold out
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton disabled={photo.busy}>Add product</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function JobForm({ companyId }: { companyId: string }) {
  const [state, action] = useActionState<BizState, FormData>(saveJob, {});
  const f = useAddForm(action, state);
  return (
    <form ref={f.ref} action={f.action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      <label className={label}>
        Job title
        <input name="title" required maxLength={100} className="field font-normal" />
      </label>
      <label className={label}>
        Type
        <select name="job_type" className="field font-normal">
          {["full-time", "part-time", "contract", "seasonal", "internship"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Where
        <input name="location" maxLength={100} placeholder="Toronto, ON or Remote" className="field font-normal" />
      </label>
      <label className={label}>
        How to apply (link)
        <input name="apply_url" maxLength={200} className="field font-normal" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        About the job
        <textarea name="description" rows={3} maxLength={1500} className="field font-normal" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton>Post job</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function EventForm({ companyId }: { companyId: string }) {
  const [state, action] = useActionState<BizState, FormData>(saveEvent, {});
  const f = useAddForm(action, state);
  const [offset, setOffset] = useState("0");
  useEffect(() => setOffset(String(new Date().getTimezoneOffset())), []);
  return (
    <form ref={f.ref} action={f.action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="tz_offset" value={offset} />
      <label className={`${label} sm:col-span-2`}>
        Event name
        <input name="title" required maxLength={100} className="field font-normal" />
      </label>
      <label className={label}>
        Starts
        <input name="starts_local" type="datetime-local" required className="field font-normal" />
      </label>
      <label className={label}>
        Ends (optional)
        <input name="ends_local" type="datetime-local" className="field font-normal" />
      </label>
      <label className={label}>
        Where
        <input name="location" maxLength={120} className="field font-normal" />
      </label>
      <label className={label}>
        Link (optional)
        <input name="url" maxLength={200} className="field font-normal" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        About the event
        <textarea name="description" rows={2} maxLength={1000} className="field font-normal" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton>Add event</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}
