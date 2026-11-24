import { NextResponse } from "next/server";
import { loadHelp, searchHelp } from "@/lib/help";

/** Help search as you type (Update 7). A plain request, so it never holds up page navigation. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 200);
  return NextResponse.json(searchHelp(await loadHelp(), q), { headers: { "cache-control": "public, max-age=60" } });
}
