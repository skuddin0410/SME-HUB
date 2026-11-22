import { createClient } from "@supabase/supabase-js";

/** Server-only client for the Stripe webhook. The key is a server setting (AWS Amplify), never in code or the browser. */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
