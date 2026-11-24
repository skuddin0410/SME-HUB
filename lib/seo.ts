import type { Metadata } from "next";

/**
 * The public address of the hub. Set NEXT_PUBLIC_SITE_URL (for example https://smehub.ca) when the
 * site goes live on its real domain. Until then search engines are told to stay out, so the
 * preview address and the demo members are not indexed.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
export const INDEXABLE = SITE_URL !== "";
export const SITE_NAME = "SME Hub";
export const SITE_DESCRIPTION = "Canada's small business network. Connect, learn and grow with entrepreneurs, professionals and business leaders across Canada.";

/** One or two sentences for a search result, cut at a word. */
export function snippet(text: string, max = 158) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, clean.lastIndexOf(" ", max - 1) || max - 1)}…`;
}

/** Title, description, canonical address and share-card tags for one page. */
export function pageMeta({ title, description, path, image, type = "website", index = true }: { title: string; description: string; path: string; image?: string | null; type?: "website" | "profile" | "article"; index?: boolean }): Metadata {
  const text = snippet(description);
  return {
    title,
    description: text,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: false },
    openGraph: { title, description: text, url: path, type, siteName: SITE_NAME, images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title, description: text },
  };
}

/** Structured data for search engines. "<" is escaped so the text cannot close the script tag. */
export function jsonLd(data: Record<string, unknown>) {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") };
}

export const absolute = (path: string) => `${SITE_URL}${path}`;
