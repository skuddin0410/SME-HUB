import { updateSession } from "@/lib/supabase/middleware";
import { cmsRewrite } from "@/lib/cms-format";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  // cms.smbhub.ca serves the CMS (app/cms) at its root; the session cookies refreshed above carry over
  const target = cmsRewrite(request.headers.get("host"), request.nextUrl.pathname);
  if (!target || response.headers.get("location")) return response;
  const url = request.nextUrl.clone();
  url.pathname = target;
  const rewritten = NextResponse.rewrite(url, { request });
  response.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
  return rewritten;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
