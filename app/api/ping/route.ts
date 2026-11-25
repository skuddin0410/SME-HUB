import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Speed: a tiny address the "keep warm" job calls every few minutes, so Amplify's server is awake when members click. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
