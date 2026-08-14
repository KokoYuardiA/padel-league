import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import {
  requireGroupRole,
  groupIdFromParam,
  ANY_GROUP_MEMBER,
  GROUP_ADMIN_ONLY,
} from '../middlewares/rbac.middleware'
import { supabaseAdmin } from '../lib/supabase'
import { z } from 'zod'

export const groupsRouter = Router()

// ── GET /api/groups ─────────────────────────────────────────
// Returns all groups the current user is a member of
groupsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('group_members')
    .select('role, groups(id, name, description, is_public, invite_code, created_at, suspended_at)')
    .eq('user_id', userId)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  res.json({ data })
})

// ── POST /api/groups ────────────────────────────────────────
// Create a new group — caller becomes Group Admin
export const CreateGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  is_public: z.boolean().default(false),
})

groupsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = CreateGroupSchema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    return
  }

  const userId = req.user!.id
  const { name, description, is_public } = parsed.data

  // Create group
  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .insert({ name, description, is_public, created_by: userId })
    .select()
    .single()

  if (groupError) {
    res.status(500).json({ error: groupError.message })
    return
  }

  // Add creator as Group Admin member
  const { error: memberError } = await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'Group Admin' })

  if (memberError) {
    res.status(500).json({ error: memberError.message })
    return
  }

  res.status(201).json({ data: group })
})

// ── GET /api/groups/:id ──────────────────────────────────────
// Get group detail (with members) — must be a member
groupsRouter.get(
  '/:id',
  requireAuth,
  requireGroupRole(ANY_GROUP_MEMBER, groupIdFromParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const groupId = req.params.id

    const { data: group, error } = await supabaseAdmin
      .from('groups')
      .select(`
        id, name, description, is_public, invite_code, created_by, created_at,
        group_members(role, user_id, profiles(id, full_name, skill_level, avatar_url))
      `)
      .eq('id', groupId)
      .single()

    if (error) {
      res.status(404).json({ error: 'Group not found' })
      return
    }

    res.json({ data: group })
  }
)

// ── PATCH /api/groups/:id ─────────────────────────────────────
// Edit group settings — Group Admin only
export const UpdateGroupSchema = z
  .object({
    name: z.string().min(3).max(100).optional(),
    description: z.string().max(500).optional(),
    is_public: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'At least one field must be provided' })

groupsRouter.patch(
  '/:id',
  requireAuth,
  requireGroupRole(GROUP_ADMIN_ONLY, groupIdFromParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = UpdateGroupSchema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('groups')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.json({ data })
  }
)

// ── PATCH /api/groups/:id/members/:userId ─────────────────────
// Change a member's role (Player <-> Organizer) — Group Admin only.
// Group Admin ownership itself is not transferable through this endpoint.
export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['Player', 'Organizer']),
})

groupsRouter.patch(
  '/:id/members/:userId',
  requireAuth,
  requireGroupRole(GROUP_ADMIN_ONLY, groupIdFromParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const groupId = req.params.id
    const targetUserId = req.params.userId

    if (targetUserId === req.user!.id) {
      res.status(400).json({ error: 'You cannot change your own role' })
      return
    }

    const { data: group } = await supabaseAdmin.from('groups').select('created_by').eq('id', groupId).single()
    if (group?.created_by === targetUserId) {
      res.status(400).json({ error: "The group owner's role cannot be changed" })
      return
    }

    const parsed = UpdateMemberRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('group_members')
      .update({ role: parsed.data.role })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)
      .select()
      .single()

    if (error || !data) {
      res.status(404).json({ error: 'Member not found in this group' })
      return
    }

    res.json({ data })
  }
)

// ── DELETE /api/groups/:id/members/:userId ────────────────────
// Remove a member from the group — Group Admin only
groupsRouter.delete(
  '/:id/members/:userId',
  requireAuth,
  requireGroupRole(GROUP_ADMIN_ONLY, groupIdFromParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const groupId = req.params.id
    const targetUserId = req.params.userId

    const { data: group } = await supabaseAdmin.from('groups').select('created_by').eq('id', groupId).single()
    if (group?.created_by === targetUserId) {
      res.status(400).json({ error: 'The group owner cannot be removed' })
      return
    }

    const { error, count } = await supabaseAdmin
      .from('group_members')
      .delete({ count: 'exact' })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId)

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    if (!count) {
      res.status(404).json({ error: 'Member not found in this group' })
      return
    }

    res.status(204).send()
  }
)

// ── GET /api/groups/join/:invite_code/preview ────────────────
// Preview a group by invite code before actually joining — lets the
// frontend show a confirm step instead of auto-joining on page load.
groupsRouter.get('/join/:invite_code/preview', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const { invite_code } = req.params

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, suspended_at, group_members(count)')
    .eq('invite_code', invite_code)
    .single()

  if (groupError || !group) {
    res.status(404).json({ error: 'Invalid or expired invite code' })
    return
  }

  const { data: membership } = await supabaseAdmin
    .from('group_members')
    .select('user_id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle()

  const memberCount = (group.group_members as unknown as { count: number }[] | null)?.[0]?.count ?? 0

  res.json({
    data: {
      id: group.id,
      name: group.name,
      description: group.description,
      suspended_at: group.suspended_at,
      member_count: memberCount,
      already_member: !!membership,
    },
  })
})

// ── POST /api/groups/join/:invite_code ──────────────────────
// Join a group via invite code
groupsRouter.post('/join/:invite_code', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  const { invite_code } = req.params

  const { data: group, error: groupError } = await supabaseAdmin
    .from('groups')
    .select('id, name, suspended_at')
    .eq('invite_code', invite_code)
    .single()

  if (groupError || !group) {
    res.status(404).json({ error: 'Invalid or expired invite code' })
    return
  }

  // requireGroupRole()'s central suspension check doesn't cover this route —
  // the caller isn't a member yet, so it never passes through that
  // middleware at all. Gate it here explicitly instead.
  if (group.suspended_at) {
    res.status(403).json({ error: 'Grup ini sedang disuspend dan tidak menerima anggota baru.' })
    return
  }

  const { error } = await supabaseAdmin
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'Player' })

  if (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'You are already a member of this group' })
    } else {
      res.status(500).json({ error: error.message })
    }
    return
  }

  res.status(201).json({ data: { message: `Successfully joined ${group.name}` } })
})
