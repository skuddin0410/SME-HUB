import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fromPublic, vcard } from "@/lib/business-card";

/** Update 31: Save contact. A vCard 3.0 with only the fields the member switched on. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9-]{2,60}$/i.test(handle)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("card_public", { p_handle: handle.toLowerCase() });
  if (error || !data) return new NextResponse("This card is no longer available.", { status: 404 });
  const c = fromPublic(data as Record<string, unknown>);
  await supabase.rpc("card_count", { p_handle: c.handle, p_kind: "save" });
  return new NextResponse(vcard(c), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${c.handle}.vcf"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
