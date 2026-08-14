import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  )
}

/**
 * Supabase Admin client — uses the service role key which bypasses RLS.
 * Only use this on the server side (never expose to client).
 * Use this for:
 * - Auto-generating match schedules
 * - Score overrides by Organizer
 * - Admin operations (user/group management)
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
