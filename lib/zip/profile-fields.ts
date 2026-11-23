import type { Field } from "@/lib/zip/settings";

/** The fields the team added (the built-in ones already have their own places on the profile). */
export function customFields(all: unknown): Field[] {
  return (Array.isArray(all) ? (all as Field[]) : []).filter((f) => f && !f.core && typeof f.k === "string");
}

/** Whether this viewer may see a field the team set to a given audience. */
export function fieldAllowed(vis: string, v: { self: boolean; signedIn: boolean; connected: boolean; staff: boolean }) {
  if (v.self || v.staff) return true;
  if (vis === "public") return true;
  if (vis === "members") return v.signedIn;
  if (vis === "conn") return v.connected;
  return false;
}

/** Tidies one answer by its field type; returns null when it should be dropped. */
export function cleanAnswer(type: string, raw: string): string | null {
  const t = raw.trim().slice(0, 300);
  if (!t) return null;
  if (type === "Number") return Number.isFinite(Number(t)) ? String(Number(t)) : null;
  if (type === "Email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
  if (type === "Web address") return /^https?:\/\//i.test(t) ? t : /^[\w-]+(\.[\w-]+)+/.test(t) ? `https://${t}` : null;
  return t;
}
