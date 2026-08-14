import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import { requirePlatformAdmin } from '../middlewares/admin.middleware'
import { supabaseAdmin } from '../lib/supabase'

export const adminRouter = Router()

// ── GET /api/admin/groups ────────────────────────────────────
// Every group platform-wide (public and private, active and suspended),
// with member counts — for Platform Admin support/moderation.
adminRouter.get(
  '/groups',
  requireAuth,
  requirePlatformAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .select('id, name, description, is_public, suspended_at, created_by, created_at, group_members(count)')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    const shaped = (data ?? []).map(({ group_members, ...g }) => ({
      ...g,
      member_count: (group_members as { count: number }[] | null)?.[0]?.count ?? 0,
    }))

    res.json({ data: shaped })
  }
)

// ── GET /api/admin/users ─────────────────────────────────────
// Every user platform-wide. auth.users (email) and profiles (name/skill/
// etc.) are separate stores; cross-referenced here by id.
adminRouter.get(
  '/users',
  requireAuth,
  requirePlatformAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (authError) {
      res.status(500).json({ error: authError.message })
      return
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone_number, skill_level, avatar_url, created_at')

    if (profilesError) {
      res.status(500).json({ error: profilesError.message })
      return
    }

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

    const merged = authData.users.map((u) => {
      const profile = profileById.get(u.id)
      return {
        id: u.id,
        email: u.email,
        auth_created_at: u.created_at,
        full_name: profile?.full_name ?? null,
        phone_number: profile?.phone_number ?? null,
        skill_level: profile?.skill_level ?? null,
        avatar_url: profile?.avatar_url ?? null,
      }
    })

    res.json({ data: merged })
  }
)

// ── PATCH /api/admin/groups/:id/suspend ──────────────────────
adminRouter.patch(
  '/groups/:id/suspend',
  requireAuth,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .update({ suspended_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    res.json({ data })
  }
)

// ── PATCH /api/admin/groups/:id/unsuspend ────────────────────
adminRouter.patch(
  '/groups/:id/unsuspend',
  requireAuth,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { data, error } = await supabaseAdmin
      .from('groups')
      .update({ suspended_at: null })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    res.json({ data })
  }
)
