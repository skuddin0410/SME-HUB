import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { zoomConnect } from "@/lib/apps/zoom";
import { checkState, siteOrigin } from "@/lib/apps/oauth";

export const dynamic = "force-dynamic";

/** Zoom sends the Advisor back here with a one-time code; we swap it for tokens and store them encrypted. */
export async function GET(req: Request) {
  const site = await siteOrigin();
  const u = new URL(req.url);
  const next = await checkState("zm_state", u.searchParams.get("state"));
  const back = (n: string, flag: string) => NextResponse.redirect(`${site}${n}${n.includes("?") ? "&" : "?"}zoom=${flag}`);
  if (!next) return back("/settings/apps", "expired");
  const code = u.searchParams.get("code");
  if (!code) return back(next, "cancelled");
  const { supabase, userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=${encodeURIComponent(next)}`);
  const { data: can } = await supabase.rpc("can_host_events", { uid: userId });
  if (can !== true) return back("/settings/apps", "advisor");
  try {
    await zoomConnect(userId, code, `${site}/api/apps/zoom/callback`);
  } catch (e) {
    console.error("zoom connect:", (e as Error).message);
    return back(next, "failed");
  }
  revalidatePath("/settings/apps");
  revalidatePath("/settings/consultations");
  return back(next, "connected");
}
