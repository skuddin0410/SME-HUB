/**
 * Update 40: how complete a business page is. The same 9 checks everywhere (My businesses, and any reminder email),
 * so the number always matches. Each check names the manage tab where it is done.
 */
export type BizForChecks = {
  logo_url: string | null; cover_url: string | null; about: string | null; hours: Record<string, unknown[]> | null; appointments: boolean | null;
  services: number; photos: number; website: string | null; phone: string | null; email: string | null; social: Record<string, string> | null; updates: number;
};
export type BizCheck = { key: string; label: string; ok: boolean; tab: "details" | "photos" | "services" | "updates" };

export function bizChecks(b: BizForChecks): BizCheck[] {
  const hours = !!b.appointments || Object.values(b.hours ?? {}).some((d) => Array.isArray(d) && d.length > 0);
  const social = Object.values(b.social ?? {}).some((v) => !!String(v ?? "").trim());
  return [
    { key: "logo", label: "Add your logo", ok: !!b.logo_url, tab: "details" },
    { key: "cover", label: "Add a header photo", ok: !!b.cover_url, tab: "details" },
    { key: "about", label: "Say what you do in a few lines", ok: (b.about ?? "").trim().length > 40, tab: "details" },
    { key: "hours", label: "Add your opening hours", ok: hours, tab: "details" },
    { key: "services", label: "List at least one service", ok: b.services > 0, tab: "services" },
    { key: "photos", label: "Add 3 or more photos", ok: b.photos >= 3, tab: "photos" },
    { key: "contact", label: "Add a website, phone or email", ok: !!(b.website || b.phone || b.email), tab: "details" },
    { key: "social", label: "Link a social account", ok: social, tab: "details" },
    { key: "update", label: "Post your first update", ok: b.updates > 0, tab: "updates" },
  ];
}
export const bizPct = (c: BizCheck[]) => Math.round((c.filter((x) => x.ok).length / c.length) * 100);
