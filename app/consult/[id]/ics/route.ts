import { NextResponse } from "next/server";
import { getViewer } from "@/lib/hub";
import { getBooking, memberIcs } from "@/lib/apps/consult-server";

export const dynamic = "force-dynamic";

/** Update 36: "Add to calendar" for a free consultation. Each person gets their own copy (the member's has the join link). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("Not found", { status: 404 });
  const { userId } = await getViewer();
  const b = await getBooking(id);
  if (!userId || !b || (userId !== b.member_id && userId !== b.advisor_id)) return new NextResponse("Not found", { status: 404 });
  const body = await memberIcs(b, userId === b.member_id);
  if (!body) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="free-consultation.ics"', "Cache-Control": "private, no-store" },
  });
}
