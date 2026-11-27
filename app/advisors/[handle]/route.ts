import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/courses-mail";

export const dynamic = "force-dynamic";

/** Update 36: an Advisor's booking page link, smehub.ca/advisors/<handle>: their profile, at the booking calendar. */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const site = siteUrl();
  const h = decodeURIComponent(handle).toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/.test(h)) return NextResponse.redirect(`${site}/smb-advisor`);
  const supabase = await createClient();
  let id: string | null = /^[0-9a-f-]{36}$/.test(h) ? h : null;
  if (!id) {
    const { data } = await supabase.rpc("card_public", { p_handle: h });
    id = ((data ?? null) as { id?: string; member_id?: string } | null)?.member_id ?? ((data ?? null) as { id?: string } | null)?.id ?? null;
  }
  if (!id) {
    const { data } = await supabase.from("profiles").select("id").eq("handle", h).maybeSingle();
    id = (data as { id?: string } | null)?.id ?? null;
  }
  return NextResponse.redirect(id ? `${site}/members/${id}#advbook` : `${site}/smb-advisor`);
}
