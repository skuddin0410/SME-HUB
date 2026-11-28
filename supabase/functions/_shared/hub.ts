// Who is calling, for Maple's Edge Functions. Uses the standard Supabase pattern:
// the member's own token (Authorization header) checks who they are, and the server
// key (the default secret key, or the legacy service_role key, both provided to every Edge Function) does the writing.
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function caller(req: Request): Promise<{ user: User; db: SupabaseClient } | null> {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = named('SUPABASE_PUBLISHABLE_KEYS') || (Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const service = named('SUPABASE_SECRET_KEYS') || (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const auth = req.headers.get('Authorization') ?? ''
  if (!url || !anon || !service || !/^Bearer\s+\S+/.test(auth)) return null
  const asUser = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data, error } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/, ''))
  if (error || !data.user) return null
  // server client: bypasses row level security, so every query below names the member
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  return { user: data.user, db }
}

/** The Hub team: listed in team_roles (the same rule as is_staff() in the database). */
export async function isHubTeam(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from('team_roles').select('user_id').eq('user_id', userId).limit(1)
  return (data ?? []).length > 0
}

/** The "default" key from Supabase's JSON key list (new API keys), or empty. */
function named(env: string): string {
  try {
    const v = JSON.parse(Deno.env.get(env) ?? '{}')
    return typeof v?.default === 'string' ? v.default : ''
  } catch {
    return ''
  }
}
