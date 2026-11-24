import { notFound } from "next/navigation";
import { pgBySlug, pgSlug } from "@/lib/guides/data";
import { pageMeta } from "@/lib/seo";
import { getViewer } from "@/lib/hub";
import { ProvincePage } from "@/components/guides/province";
import "@/styles/province.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = pgBySlug((await params).slug);
  if (!p) return { title: "Page not found" };
  return pageMeta({ title: `Doing business in ${p.n}`, description: p.sub, path: `/guides/${pgSlug(p.n)}` });
}

/** Members, published businesses and live listings for sale in the province. Counts only; nothing private. */
async function counts(c: string): Promise<[number, number, number]> {
  try {
    const { supabase } = await getViewer();
    const [m, b, f] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).ilike("location", `%, ${c}`).eq("status", "active"),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("province", c).eq("status", "published"),
      supabase.rpc("sale_browse"),
    ]);
    const sale = Array.isArray(f.data) ? (f.data as { province?: string }[]).filter((x) => x.province === c).length : 0;
    return [m.count ?? 0, b.count ?? 0, sale];
  } catch {
    return [0, 0, 0];
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const p = pgBySlug((await params).slug);
  if (!p) notFound();
  return <ProvincePage p={p} counts={await counts(p.c)} />;
}
