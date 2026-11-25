/**
 * Keep-warm: a tiny address that does no work. Calling it keeps Amplify's server awake, so the first click after a quiet
 * spell is as fast as any other. Called by the database every 2 minutes (migration 0065) and by the browser when a
 * member comes back to the tab (components/stay-warm.tsx). It reads nothing and returns nothing.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
