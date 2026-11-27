import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { fromPublic, vcard } from "@/lib/business-card";

/** Update 31: Save contact. A vCard 3.0 with only the fields the member switched on. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (!/^[a-z0-9-]{2,60}$/i.test(handle)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  // spam: at most 30 contact downloads per address every 10 minutes
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  const { data: allowed } = await supabase.rpc("rate_hit", { p_key: `vcf:${ip}`, p_max: 30, p_window: "10 minutes" });
  if (allowed === false) return new NextResponse("Too many requests. Try again in a few minutes.", { status: 429 });
  const { data, error } = await supabase.rpc("card_public", { p_handle: handle.toLowerCase() });
  if (error || !data || (data as { paused?: boolean }).paused) return new NextResponse("This card is no longer available.", { status: 404 });
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
