import { Router, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase'

// Every route in this file is deliberately unauthenticated (the only prior
// precedent in the app is GET /health) — kept in its own file rather than
// folded into groups.routes.ts so that stands out clearly rather than
// blending in among routes that all require a session.
export const publicRouter = Router()

const PUBLIC_EVENT_STATUSES = ['Open', 'Full', 'In Progress', 'Completed']

// ── GET /api/public/groups ───────────────────────────────────
// Every is_public=true, non-suspended group. No auth. No invite_code, no
// member list, no player-identifying data — a Guest can view only, never
// join (PRD §3); exposing invite_code here would open a join path this
// phase deliberately doesn't build.
publicRouter.get('/groups', async (_req, res: Response): Promise<void> => {
  const { data, error } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, created_at, group_members(count)')
    .eq('is_public', true)
    .is('suspended_at', null)
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
})

// ── GET /api/public/groups/:id ───────────────────────────────
// Public group preview + its own public-facing events. 404s (not 403) if
// the group doesn't exist, isn't public, or is suspended — an anonymous
// visitor shouldn't be able to distinguish those cases from each other.
publicRouter.get('/groups/:id', async (req, res: Response): Promise<void> => {
  const { data: group, error } = await supabaseAdmin
    .from('groups')
    .select('id, name, description, created_at, group_members(count)')
    .eq('id', req.params.id)
    .eq('is_public', true)
    .is('suspended_at', null)
    .single()

  if (error || !group) {
    res.status(404).json({ error: 'Group not found or not public' })
    return
  }

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('events')
    .select('id, title, format, event_date, start_time, location, status, max_players, courts_count')
    .eq('group_id', req.params.id)
    .in('status', PUBLIC_EVENT_STATUSES)
    .order('event_date', { ascending: true })

  if (eventsError) {
    res.status(500).json({ error: eventsError.message })
    return
  }

  const { group_members, ...groupFields } = group as typeof group & {
    group_members: { count: number }[] | null
  }

  res.json({
    data: {
      ...groupFields,
      member_count: group_members?.[0]?.count ?? 0,
      events: events ?? [],
    },
  })
})
