import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { getBooking } from "@/lib/apps/consult-server";
import { startUrl } from "@/lib/apps/zoom";
import { siteUrl } from "@/lib/courses-mail";

export const dynamic = "force-dynamic";

/**
 * Update 36: "Start the Zoom meeting" for a free consultation (the Advisor only). Zoom's start link expires, so it
 * is fetched fresh from Zoom each time and never stored or emailed. The member's link is their join link.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const site = siteUrl();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(`${site}/settings/consultations`);
  const { userId } = await getViewer();
  if (!userId) return NextResponse.redirect(`${site}/auth/login?next=${encodeURIComponent(`/consult/${id}/start`)}`);
  const b = await getBooking(id);
  if (!b || b.status !== "booked") return NextResponse.redirect(`${site}/settings/consultations`);
  if (userId === b.member_id) return NextResponse.redirect(b.join_url ?? `${site}/members/${b.advisor_id}#advbook`);
  if (userId !== b.advisor_id || !b.meeting_id) return NextResponse.redirect(`${site}/settings/consultations`);
  try {
    return NextResponse.redirect(await startUrl(b.advisor_id, b.meeting_id));
  } catch {
    return NextResponse.redirect(`${site}/settings/apps?zoom=failed`);
  }
}
