import { Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { AuthenticatedRequest } from './auth.middleware'

export type GroupRole = 'Group Admin' | 'Organizer' | 'Player'

export const ANY_GROUP_MEMBER: GroupRole[] = ['Group Admin', 'Organizer', 'Player']
export const ORGANIZER_OR_ADMIN: GroupRole[] = ['Organizer', 'Group Admin']
export const GROUP_ADMIN_ONLY: GroupRole[] = ['Group Admin']

type GroupIdResolver = (req: AuthenticatedRequest) => Promise<string | null>

/** Resolves group_id directly from a route param, e.g. `/api/groups/:id`. */
export function groupIdFromParam(paramName = 'id'): GroupIdResolver {
  return async (req) => req.params[paramName] ?? null
}

/** Resolves group_id from a query string param, e.g. `/api/events?group_id=`. */
export function groupIdFromQuery(queryName = 'group_id'): GroupIdResolver {
  return async (req) => (req.query[queryName] as string | undefined) ?? null
}

/** Resolves group_id from the JSON request body, e.g. `POST /api/events`. */
export function groupIdFromBody(field = 'group_id'): GroupIdResolver {
  return async (req) => req.body?.[field] ?? null
}

/** Resolves group_id by looking up an event via a route param holding the event id. */
export function groupIdFromEventParam(paramName = 'id'): GroupIdResolver {
  return async (req) => {
    const eventId = req.params[paramName]
    if (!eventId) return null
    const { data } = await supabaseAdmin.from('events').select('group_id').eq('id', eventId).single()
    return data?.group_id ?? null
  }
}

/** Resolves group_id by looking up an event via a query-string param holding the event id. */
export function groupIdFromEventQuery(queryName = 'event_id'): GroupIdResolver {
  return async (req) => {
    const eventId = req.query[queryName] as string | undefined
    if (!eventId) return null
    const { data } = await supabaseAdmin.from('events').select('group_id').eq('id', eventId).single()
    return data?.group_id ?? null
  }
}

/** Resolves group_id by looking up a match's event, then that event's group. */
export function groupIdFromMatchParam(paramName = 'id'): GroupIdResolver {
  return async (req) => {
    const matchId = req.params[paramName]
    if (!matchId) return null
    const { data: match } = await supabaseAdmin.from('matches').select('event_id').eq('id', matchId).single()
    if (!match) return null
    const { data: event } = await supabaseAdmin.from('events').select('group_id').eq('id', match.event_id).single()
    return event?.group_id ?? null
  }
}

/**
 * Express middleware factory: requires the authenticated user to hold one of
 * `allowedRoles` in the group resolved by `resolveGroupId`. Must run after `requireAuth`.
 */
export function requireGroupRole(allowedRoles: GroupRole[], resolveGroupId: GroupIdResolver) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const groupId = await resolveGroupId(req)

    if (!groupId) {
      res.status(404).json({ error: 'Could not resolve a group for this request' })
      return
    }

    const { data: membership } = await supabaseAdmin
      .from('group_members')
      .select('role, groups(suspended_at)')
      .eq('group_id', groupId)
      .eq('user_id', req.user!.id)
      .single()

    if (!membership || !allowedRoles.includes(membership.role as GroupRole)) {
      res.status(403).json({ error: 'Insufficient permissions for this action' })
      return
    }

    // Suspending a group is a full lockout for everyone, enforced from this
    // single choke point — every group/event/match route that resolves its
    // group_id through requireGroupRole is covered automatically. The one
    // route that ISN'T covered here is POST /api/groups/join/:invite_code
    // (the caller isn't a member yet, so it never reaches this middleware at
    // all) — that route gates suspension separately, inline.
    const group = membership.groups as unknown as { suspended_at: string | null } | null
    if (group?.suspended_at) {
      res.status(403).json({ error: 'This group has been suspended by a platform administrator' })
      return
    }

    next()
  }
}
