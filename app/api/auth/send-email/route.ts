import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@/lib/auth/webhook";
import { buildAuthEmails, type HookPayload } from "@/lib/auth/hook-emails";
import { siteOrigin } from "@/lib/auth/site";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

/** Supabase expects this shape when a hook fails; the message reaches the person signing up. */
function hookError(status: number, message: string) {
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

/**
 * Supabase Auth "Send Email" hook. Supabase calls this instead of sending its own emails,
 * so every account email uses our templates and goes out from security@ through Resend.
 * Only requests signed with SEND_EMAIL_HOOK_SECRET are accepted.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) return hookError(500, "Email is not configured on the server.");

  const body = await request.text();
  const ok = verifyWebhook(
    secret,
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    body,
  );
  if (!ok) return hookError(401, "Invalid signature.");

  let emails;
  try {
    emails = await buildAuthEmails(JSON.parse(body) as HookPayload, siteOrigin(request.headers, request.url));
  } catch (e) {
    return hookError(400, (e as Error).message);
  }

  try {
    for (const { to, message } of emails) await sendEmail({ to, ...message });
  } catch (e) {
    console.error("send-email hook:", (e as Error).message);
    return hookError(502, "We could not send the email. Please try again in a minute.");
  }
  return NextResponse.json({});
}
