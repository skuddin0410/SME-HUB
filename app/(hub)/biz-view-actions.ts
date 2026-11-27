"use server";

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getViewer } from "@/lib/hub";

/**
 * Update 40: counts a visit to a business page (once a day per visitor). Visitors who aren't signed in get a
 * random id in a cookie, so they count once too. The page's own team isn't counted (checked in the database).
 */
export async function seeBusiness(companyId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return;
  const { supabase, userId } = await getViewer();
  let visitor: string | null = null;
  if (!userId) {
    const jar = await cookies();
    visitor = jar.get("sh_vid")?.value ?? null;
    if (!visitor || !/^v_[A-Za-z0-9_-]{20,40}$/.test(visitor)) {
      visitor = `v_${randomBytes(18).toString("base64url")}`;
      jar.set("sh_vid", visitor, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    }
  }
  await supabase.rpc("business_seen", { p_company: companyId, p_visitor: visitor });
}
