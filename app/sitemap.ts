import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { GUIDES, POLICIES, RESOURCE_PAGES, SECTIONS } from "@/lib/content";
import { INDEXABLE, SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INDEXABLE) return [];
  // a visitor's view of the database: only what anyone can see ends up in the sitemap
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const [members, companies, groups, sales] = await Promise.all([
    supabase.from("profiles").select("id, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(20000),
    supabase.from("companies").select("slug, updated_at").eq("status", "published").limit(20000),
    supabase.from("groups").select("slug, created_at").eq("is_private", false).limit(5000),
    supabase.rpc("sale_browse"),
  ]);

  const fixed = ["/feed", "/members", "/businesses", "/groups", "/about", "/membership-plans", "/help", "/contact", "/how-sme-hub-works", "/courses", "/for-sale", "/guides", "/resources"];
  const stories = Object.values(SECTIONS).flatMap((s) => [s.path, ...s.items.map((i) => `${s.path}/${i.slug}`)]);
  const reference = [...GUIDES.map((g) => `/guides/${g.slug}`), ...RESOURCE_PAGES.map((r) => `/resources/${r.slug}`), ...POLICIES.map((p) => `/policies/${p.slug}`)];

  return [
    ...[...fixed, ...stories, ...reference].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...(members.data ?? []).map((m) => ({ url: `${SITE_URL}/members/${m.id}`, lastModified: m.created_at as string })),
    ...(companies.data ?? []).map((c) => ({ url: `${SITE_URL}/businesses/${c.slug}`, lastModified: c.updated_at as string })),
    ...(groups.data ?? []).map((g) => ({ url: `${SITE_URL}/groups/${g.slug}`, lastModified: g.created_at as string })),
    ...((sales.data ?? []) as { slug: string }[]).map((l) => ({ url: `${SITE_URL}/for-sale/${l.slug}` })),
  ];
}
