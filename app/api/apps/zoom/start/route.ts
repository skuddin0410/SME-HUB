import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { zoomAuthorizeUrl, zoomConfigured } from "@/lib/apps/zoom";
import { newState, safeNext, siteOrigin } from "@/lib/apps/oauth";

export const dynamic = "force-dynamic";

/** Update 36: "Continue to Zoom". SME Advisors only. Zoom's own sign-in opens, then comes back to /callback. */
export async function GET(req: Request) {
  const site = await siteOrigin();
  const next = safeNext(new URL(req.url).searchParams.get("next"), "/settings/apps");
  const { supabase, userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=${encodeURIComponent(next)}`);
  const { data: can } = await supabase.rpc("can_host_events", { uid: userId });
  if (can !== true) return NextResponse.redirect(`${site}/settings/apps?zoom=advisor`);
  if (!zoomConfigured()) return NextResponse.redirect(`${site}${next}${next.includes("?") ? "&" : "?"}zoom=setup`);
  const state = await newState("zm_state", next);
  return NextResponse.redirect(zoomAuthorizeUrl(state, `${site}/api/apps/zoom/callback`));
}
