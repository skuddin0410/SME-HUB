import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => NextResponse.json({ error: "This PDF isn’t available" }, { status: 404 });

/**
 * Update 26/27: a post's PDF. The database returns the post only to someone allowed to see it (audience, groups,
 * removal, blocks), and the private bucket only signs a file that belongs to such a post, so a reported or removed
 * post hides its PDF too. ?dl=1 downloads it under its original file name; otherwise it opens in the browser.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return notFound();
  const dl = new URL(req.url).searchParams.get("dl") === "1";
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("pdf_path, pdf_name").eq("id", id).maybeSingle();
  const row = data as { pdf_path: string | null; pdf_name: string | null } | null;
  if (!row?.pdf_path) return notFound();
  const { data: signed } = await supabase.storage.from("post-pdfs").createSignedUrl(row.pdf_path, 300, dl ? { download: row.pdf_name || "document.pdf" } : undefined);
  if (!signed?.signedUrl) return notFound();
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
