import Handlebars from "handlebars";
import { CATALOGUE, type CatalogueEntry } from "./generated/catalogue";
import { LOADERS } from "./generated/loaders";
import { senderFromCatalogue, type Sender } from "./senders";

export type Rendered = { subject: string; html: string; text: string };
export type CatalogueRendered = Rendered & { from: Sender; preheader: string };

export { CATALOGUE };
export type { CatalogueEntry };

export function catalogueEntry(id: string): CatalogueEntry {
  const e = CATALOGUE.find((c) => c.id === id);
  if (!e) throw new Error(`No email called ${id}`);
  return e;
}

/** Values every email uses (the handoff's "variables every email uses"). */
export function commonVars(siteUrl: string, firstName?: string | null): Record<string, unknown> {
  const site = siteUrl.replace(/\/$/, "");
  return {
    hub_url: site,
    help_url: `${site}/help`,
    privacy_url: `${site}/policies/privacy-policy`,
    assets_url: `${site}/email-assets`,
    preferences_url: `${site}/settings`,
    first_name: firstName?.trim().split(/\s+/)[0] || "there",
  };
}

const html = Handlebars.create();
const text = Handlebars.create();

/**
 * Renders one catalogue email with Handlebars. Plain {{x}} is HTML-escaped in the HTML part, so a
 * member's name can never inject markup; the text part is not escaped (it is not HTML).
 */
export async function renderEmail(id: string, vars: Record<string, unknown>): Promise<CatalogueRendered> {
  const entry = catalogueEntry(id);
  const load = LOADERS[id];
  if (!load) throw new Error(`No template for ${id}`);
  const src = await load();
  const data = { ...vars };
  return {
    from: senderFromCatalogue(entry.sender),
    subject: text.compile(entry.subject, { noEscape: true })(data),
    preheader: text.compile(entry.preheader, { noEscape: true })(data),
    // Handlebars writes = as &#x3D;. That is valid, but a plain = is just as safe in text and in quoted attributes and keeps links readable.
    html: html.compile(src.html)(data).replace(/&#x3D;/g, "="),
    text: text.compile(src.text, { noEscape: true })(data),
  };
}
