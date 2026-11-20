import { redirect } from "next/navigation";
import { getViewer, type Profile } from "@/lib/hub";

export * from "@/lib/cms-format";

/**
 * The CMS (cms.smbhub.ca, served from app/cms). It reads and writes the hub's own Supabase tables
 * with the signed-in admin's session, so the database's security rules decide what it can do and
 * nothing here needs a service key.
 */

/** Admins only. Visitors and members are sent to the CMS sign-in. */
export async function requireCms() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/cms/login");
  if (!viewer.isStaff) redirect("/cms/login?denied=1");
  return { ...viewer, userId: viewer.userId, profile: viewer.profile as Profile };
}

