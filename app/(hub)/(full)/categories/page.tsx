import { CategoriesBrowse } from "@/components/categories/browse";
import { getTaxo } from "@/lib/categories-server";
import { getViewer } from "@/lib/hub";
import { pageMeta } from "@/lib/seo";
import "@/styles/province.css";
import "@/styles/tools.css";
import "@/styles/grants.css";
import "@/styles/categories.css";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "All business categories", description: "32 industries and 335 specialities: browse every kind of Canadian small business in the SME Hub directory.", path: "/categories" });

export default async function Page() {
  const { supabase } = await getViewer();
  const [taxo, { data }] = await Promise.all([getTaxo(), supabase.rpc("directory_facets")]);
  const counts = Object.fromEntries((((data as { categories?: { category: string; n: number }[] } | null)?.categories) ?? []).map((c) => [c.category, c.n]));
  return <div className="zip"><div className="wrap" style={{ paddingTop: 16, paddingBottom: 40 }}><CategoriesBrowse taxo={taxo} counts={counts} /></div></div>;
}
