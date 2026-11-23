import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { KEEP_COOKIE, withKeep } from "./keep";

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient(opts?: { keep?: boolean }) {
  const cookieStore = await cookies();
  // the log-in action passes the choice itself; every other request reads the marker cookie
  const keep = opts?.keep ?? cookieStore.get(KEEP_COOKIE)?.value !== "0";

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withKeep(name, options, keep)),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
