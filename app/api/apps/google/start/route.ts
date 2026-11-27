import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { gcalAuthorizeUrl, gcalConfigured } from "@/lib/apps/gcal";
import { newState, siteOrigin } from "@/lib/apps/oauth";

export const dynamic = "force-dynamic";

/** Update 36: "Google Calendar: block my busy times" (free/busy only). SME Advisors only. */
export async function GET() {
  const site = await siteOrigin();
  const { supabase, userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=/settings/apps`);
  const { data: can } = await supabase.rpc("can_host_events", { uid: userId });
  if (can !== true) return NextResponse.redirect(`${site}/settings/apps`);
  if (!gcalConfigured()) return NextResponse.redirect(`${site}/settings/apps?gcal=setup`);
  const state = await newState("gc_state", "/settings/apps");
  return NextResponse.redirect(gcalAuthorizeUrl(state, `${site}/api/apps/google/callback`));
}
