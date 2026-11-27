import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/hub";
import { gcalConnect } from "@/lib/apps/gcal";
import { checkState, siteOrigin } from "@/lib/apps/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const site = await siteOrigin();
  const u = new URL(req.url);
  const next = await checkState("gc_state", u.searchParams.get("state"));
  if (!next) return NextResponse.redirect(`${site}/settings/apps?gcal=expired`);
  const code = u.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${site}/settings/apps?gcal=cancelled`);
  const { supabase, userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=/settings/apps`);
  const { data: can } = await supabase.rpc("can_host_events", { uid: userId });
  if (can !== true) return NextResponse.redirect(`${site}/settings/apps`);
  try {
    await gcalConnect(userId, code, `${site}/api/apps/google/callback`);
  } catch (e) {
    console.error("google connect:", (e as Error).message);
    return NextResponse.redirect(`${site}/settings/apps?gcal=failed`);
  }
  revalidatePath("/settings/apps");
  return NextResponse.redirect(`${site}/settings/apps?gcal=connected`);
}
