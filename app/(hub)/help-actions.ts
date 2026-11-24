"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Was this helpful?" One answer per member, or per visitor's browser, per article; answering again changes it. */
export async function voteHelp(articleId: string, helpful: boolean): Promise<{ ok: boolean }> {
  if (!/^[a-z0-9-]{1,80}$/.test(articleId)) return { ok: false };
  const jar = await cookies();
  let v = jar.get("smehub_v")?.value ?? "";
  if (!UUID.test(v)) {
    v = crypto.randomUUID();
    jar.set("smehub_v", v, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("help_vote", { p_article: articleId, p_helpful: !!helpful, p_visitor: v });
  return { ok: !error };
}
