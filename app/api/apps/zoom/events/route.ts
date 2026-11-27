import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { zoomGoneEmail } from "@/lib/apps/consult-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Update 36: Zoom's event notifications for the SME Hub app (set this address as the app's event endpoint and its
 * deauthorization endpoint, with ZOOM_WEBHOOK_SECRET as the secret token).
 *  - endpoint.url_validation: Zoom checks we own this address.
 *  - app_deauthorized: an Advisor removed SME Hub inside Zoom. We forget their tokens and email them the list of
 *    upcoming events and calls that now need a link. Their meetings stay in their Zoom.
 */
export async function POST(req: Request) {
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Not set up" }, { status: 503 });
  const raw = await req.text();
  let body: { event?: string; payload?: { plainToken?: string; user_id?: string } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (body.event === "endpoint.url_validation" && body.payload?.plainToken) {
    const plainToken = body.payload.plainToken;
    return NextResponse.json({ plainToken, encryptedToken: createHmac("sha256", secret).update(plainToken).digest("hex") });
  }
  const ts = req.headers.get("x-zm-request-timestamp") ?? "";
  const sig = req.headers.get("x-zm-signature") ?? "";
  const want = `v0=${createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex")}`;
  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
  if (!fresh || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });

  if (body.event === "app_deauthorized" && body.payload?.user_id) {
    const db = serviceClient();
    if (db) {
      const { data } = await db.from("advisor_zoom").select("user_id").eq("zoom_user_id", String(body.payload.user_id)).limit(5);
      for (const r of (data ?? []) as { user_id: string }[]) {
        await db.from("advisor_zoom").delete().eq("user_id", r.user_id);
        await zoomGoneEmail(r.user_id);
      }
    }
  }
  return NextResponse.json({ ok: true });
}
