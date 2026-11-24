import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Counts a listing view: once per member or visitor a day (the database skips the seller and repeats). */
export async function POST(req: Request) {
  let id = "";
  try {
    id = String(JSON.parse(await req.text()).id ?? "");
  } catch {}
  if (!UUID.test(id)) return NextResponse.json({ ok: false }, { status: 400 });
  const jar = await cookies();
  let v = jar.get("smehub_v")?.value ?? "";
  const fresh = !UUID.test(v);
  if (fresh) v = crypto.randomUUID();
  const supabase = await createClient();
  await supabase.rpc("sale_count_view", { p_id: id, p_visitor: v });
  const res = NextResponse.json({ ok: true });
  if (fresh) res.cookies.set("smehub_v", v, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
