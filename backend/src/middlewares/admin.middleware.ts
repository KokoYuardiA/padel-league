import { Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthenticatedRequest } from './auth.middleware'

/**
 * Express middleware: requires the authenticated user to be a Platform
 * Admin (a row in `platform_admins`). Must run after `requireAuth`.
 * Platform admin status can only be granted via a manual SQL INSERT
 * (see migrations/0008_platform_admin_and_group_suspension.sql) — there
 * is no self-service or API-driven path to grant it.
 */
export async function requirePlatformAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { data } = await supabaseAdmin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', req.user!.id)
    .maybeSingle()

  if (!data) {
    res.status(403).json({ error: 'Platform Admin access required' })
    return
  }

  next()
}
