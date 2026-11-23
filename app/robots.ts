import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // before launch (no NEXT_PUBLIC_SITE_URL) nothing is open to search engines
  if (!INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/messages", "/network", "/notifications", "/profile", "/search", "/businesses/mine", "/email-preview", "/email-assets"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
