import { Router, Response } from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import {
  requireGroupRole,
  groupIdFromBody,
  groupIdFromQuery,
  groupIdFromEventParam,
  ANY_GROUP_MEMBER,
  ORGANIZER_OR_ADMIN,
} from '../middlewares/rbac.middleware'
import { supabaseAdmin } from '../lib/supabase'
import { computePromotionCutoff } from '../lib/promotionWindow'
import { EVENT_STATUSES, EventStatus, isValidStatusTransition, ALLOWED_TRANSITIONS } from '../lib/eventStatus'
import { z } from 'zod'

const REGISTRATION_SELECT =
  'id, status, registered_at, profiles!event_registrations_user_id_fkey(id, full_name, skill_level, phone_number)'

// Ranks 'waiting_list' registrations by registered_at (1-indexed), null for
// every other status — moves this out of the frontend so every consumer of
// REGISTRATION_SELECT's result gets a single source of truth for ordering.
function attachWaitingListPosition<T extends { id: string; status: string; registered_at: string }>(
  registrations: T[]
): (T & { waiting_list_position: number | null })[] {
  const sorted = [...registrations].sort((a, b) => a.registered_at.localeCompare(b.registered_at))
  const positionById = new Map<string, number>()
  let rank = 0
  for (const reg of sorted) {
    if (reg.status === 'waiting_list') {
      rank += 1
      positionById.set(reg.id, rank)
    }
  }
  return registrations.map((reg) => ({ ...reg, waiting_list_position: positionById.get(reg.id) ?? null }))
}

// ── POST /api/events ─────────────────────────────────────────
export const CreateEventSchema = z.object({
  group_id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  format: z.enum(['Americano', 'Mexicano', 'Fixed Partner', 'Mixed Partner', 'Round Robin']),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  location: z.string().min(3).max(200),
  courts_count: z.number().int().min(1).max(20),
  max_players: z.number().int().min(4).max(64),
  registration_deadline: z.string().datetime().optional(),
})

// ── PATCH /api/events/:id/status ──────────────────────────────
export const UpdateEventStatusSchema = z.object({
  status: z.enum(EVENT_STATUSES),
})

export function createEventsRouter(io: SocketIOServer) {
  const eventsRouter = Router()

// ── GET /api/events?group_id=... ────────────────────────────
// List events for a group the user is a member of
eventsRouter.get(
  '/',
  requireAuth,
  (req, res, next) => {
    if (!req.query.group_id) {
      res.status(400).json({ error: 'group_id query parameter is required' })
      return
    }
    next()
  },
  requireGroupRole(ANY_GROUP_MEMBER, groupIdFromQuery('group_id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const groupId = req.query.group_id as string

    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('group_id', groupId)
      .order('event_date', { ascending: true })

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.json({ data })
  }
)

// ── POST /api/events ─────────────────────────────────────────
// Create a new event (must be Organizer or Group Admin)
eventsRouter.post(
  '/',
  requireAuth,
  requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromBody('group_id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = CreateEventSchema.safeParse(req.body)

    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert({ ...parsed.data, created_by: req.user!.id })
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.status(201).json({ data })
  }
)

// ── GET /api/events/:id ──────────────────────────────────────
// Get event detail with registrations
eventsRouter.get(
  '/:id',
  requireAuth,
  requireGroupRole(ANY_GROUP_MEMBER, groupIdFromEventParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const eventId = req.params.id

    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    // event_registrations has two FKs into profiles (user_id, partner_user_id),
    // so the embed must be disambiguated or PostgREST errors on it — silently,
    // if that error isn't checked, which is exactly what happened here before.
    const { data: registrations, error: registrationsError } = await supabaseAdmin
      .from('event_registrations')
      .select(REGISTRATION_SELECT)
      .eq('event_id', eventId)

    if (registrationsError) {
      console.error('[ERROR] Failed to load registrations for event', eventId, registrationsError.message)
      res.status(500).json({ error: registrationsError.message })
      return
    }

    res.json({ data: { ...event, registrations: attachWaitingListPosition(registrations) } })
  }
)

// ── POST /api/events/:id/register ────────────────────────────
// Register current user for an event — must be a group member
eventsRouter.post(
  '/:id/register',
  requireAuth,
  requireGroupRole(ANY_GROUP_MEMBER, groupIdFromEventParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const eventId = req.params.id

    // Mixed Partner needs gender-balanced teams (see scheduling/teams.ts) — block
    // registration until the player's profile has it set, rather than letting them
    // register and only failing much later at schedule-generation time.
    const { data: eventForGenderCheck } = await supabaseAdmin
      .from('events')
      .select('format')
      .eq('id', eventId)
      .single()

    if (eventForGenderCheck?.format === 'Mixed Partner') {
      const { data: profile } = await supabaseAdmin.from('profiles').select('gender').eq('id', userId).single()
      if (!profile?.gender) {
        res.status(400).json({ error: 'Lengkapi gender di profil Anda sebelum mendaftar event Mixed Partner.' })
        return
      }
    }

    // register_for_event (migrations/0002) locks the event row and does the
    // capacity count + insert inside one transaction, so concurrent requests
    // right at capacity can't both slip in as 'registered'.
    const { data, error } = await supabaseAdmin
      .rpc('register_for_event', { p_event_id: eventId, p_user_id: userId })
      .single()

    if (error) {
      if (error.message?.includes('EVENT_NOT_FOUND')) {
        res.status(404).json({ error: 'Event not found' })
      } else if (error.message?.includes('EVENT_NOT_OPEN')) {
        res.status(400).json({ error: 'Event registration is not open' })
      } else if (error.code === '23505') {
        res.status(409).json({ error: 'Already registered for this event' })
      } else {
        res.status(500).json({ error: error.message })
      }
      return
    }

    const registrationStatus = (data as { status: string }).status

    res.status(201).json({
      data,
      message: registrationStatus === 'waiting_list'
        ? 'Event is full. You have been placed on the waiting list.'
        : 'Successfully registered for the event.',
    })
  }
)

// ── PATCH /api/events/:id/status ──────────────────────────────
// Transition an event's status — Organizer or Group Admin only.
// Only a fixed set of transitions is allowed; Completed/Cancelled are terminal.
// EVENT_STATUSES/ALLOWED_TRANSITIONS/isValidStatusTransition live in lib/eventStatus.ts
// so the transition matrix can be unit-tested without touching Supabase.

eventsRouter.patch(
  '/:id/status',
  requireAuth,
  requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromEventParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const parsed = UpdateEventStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data: event } = await supabaseAdmin.from('events').select('status').eq('id', req.params.id).single()
    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    const currentStatus = event.status as EventStatus
    const nextStatus = parsed.data.status

    if (!isValidStatusTransition(currentStatus, nextStatus)) {
      res.status(400).json({
        error: `Cannot transition event from '${currentStatus}' to '${nextStatus}'`,
        allowed: ALLOWED_TRANSITIONS[currentStatus],
      })
      return
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({ status: nextStatus })
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

// ── POST /api/events/:id/withdraw ────────────────────────────
// Withdraw the caller's own registration. If they were 'registered' (not
// 'waiting_list'), the earliest waiting_list registration is auto-promoted,
// as long as we're still inside the promotion window (registration deadline
// / event start, whichever is earlier — PRD §4.1).
eventsRouter.post(
  '/:id/withdraw',
  requireAuth,
  requireGroupRole(ANY_GROUP_MEMBER, groupIdFromEventParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const eventId = req.params.id

    const { data: eventForCutoff, error: eventError } = await supabaseAdmin
      .from('events')
      .select('event_date, start_time, registration_deadline')
      .eq('id', eventId)
      .single()

    if (eventError || !eventForCutoff) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    const cutoff = computePromotionCutoff({
      eventDate: eventForCutoff.event_date,
      startTime: eventForCutoff.start_time,
      registrationDeadline: eventForCutoff.registration_deadline,
    })

    // withdraw_from_event (migrations/0006) locks the event row and does the
    // withdraw + promotion-candidate selection inside one transaction, so two
    // near-simultaneous withdrawals can't both promote the same waitlisted player.
    const { data: withdrawData, error: withdrawError } = await supabaseAdmin
      .rpc('withdraw_from_event', {
        p_event_id: eventId,
        p_user_id: userId,
        p_promotion_cutoff: cutoff.toISOString(),
      })
      .single()

    if (withdrawError) {
      if (withdrawError.message?.includes('EVENT_NOT_FOUND')) {
        res.status(404).json({ error: 'Event not found' })
      } else if (withdrawError.message?.includes('EVENT_NOT_WITHDRAWABLE')) {
        res.status(400).json({ error: 'Cannot withdraw from this event in its current status' })
      } else if (withdrawError.message?.includes('REGISTRATION_NOT_FOUND')) {
        res.status(404).json({ error: 'You are not registered for this event' })
      } else if (withdrawError.message?.includes('ALREADY_WITHDRAWN')) {
        res.status(409).json({ error: 'You have already withdrawn from this event' })
      } else {
        res.status(500).json({ error: withdrawError.message })
      }
      return
    }

    const result = withdrawData as {
      withdrawn_registration_id: string
      previous_status: 'registered' | 'waiting_list'
      promoted_registration_id: string | null
      promoted_user_id: string | null
      promotion_window_expired: boolean
    }

    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('event_registrations')
      .select(REGISTRATION_SELECT)
      .eq('event_id', eventId)

    if (fetchError) {
      res.status(500).json({ error: fetchError.message })
      return
    }

    const rankedRegistrations = attachWaitingListPosition(registrations)

    res.json({
      data: rankedRegistrations,
      promoted_user_id: result.promoted_user_id,
      promotion_window_expired: result.promotion_window_expired,
      message: result.promoted_user_id
        ? 'Berhasil membatalkan pendaftaran. Satu pemain dari daftar tunggu telah dipromosikan.'
        : 'Berhasil membatalkan pendaftaran.',
    })

    io.to(`event:${eventId}`).emit('registrations:updated', {
      event_id: eventId,
      registrations: rankedRegistrations,
      promoted_user_id: result.promoted_user_id,
    })
  }
)

// ── POST /api/events/:id/registrations/:registrationId/promote ───────────
// Organizer/Group Admin manually promotes ONE specific waiting-list
// registration — distinct from withdraw's automatic "earliest in queue"
// promotion, this lets the organizer pick a specific player out of order.
// Capacity is still enforced (no override): rejected if the event is already
// at max_players.
eventsRouter.post(
  '/:id/registrations/:registrationId/promote',
  requireAuth,
  requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromEventParam('id')),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const eventId = req.params.id
    const registrationId = req.params.registrationId

    // promote_registration (migrations/0010) locks the event row first — same
    // convention as register_for_event/withdraw_from_event — so this can't
    // race past max_players even if called concurrently with a registration
    // or another withdrawal's auto-promotion.
    const { data: promoteData, error: promoteError } = await supabaseAdmin
      .rpc('promote_registration', { p_event_id: eventId, p_registration_id: registrationId })
      .single()

    if (promoteError) {
      if (promoteError.message?.includes('EVENT_NOT_FOUND')) {
        res.status(404).json({ error: 'Event not found' })
      } else if (promoteError.message?.includes('EVENT_NOT_PROMOTABLE')) {
        res.status(400).json({ error: 'Cannot promote a player for this event in its current status' })
      } else if (promoteError.message?.includes('REGISTRATION_NOT_FOUND')) {
        res.status(404).json({ error: 'Registration not found for this event' })
      } else if (promoteError.message?.includes('NOT_WAITLISTED')) {
        res.status(400).json({ error: 'This registration is not on the waiting list' })
      } else if (promoteError.message?.includes('EVENT_FULL')) {
        res.status(409).json({ error: 'Event is already at capacity — no open slot to promote into' })
      } else {
        res.status(500).json({ error: promoteError.message })
      }
      return
    }

    const result = promoteData as { promoted_user_id: string }

    const { data: registrations, error: fetchError } = await supabaseAdmin
      .from('event_registrations')
      .select(REGISTRATION_SELECT)
      .eq('event_id', eventId)

    if (fetchError) {
      res.status(500).json({ error: fetchError.message })
      return
    }

    const rankedRegistrations = attachWaitingListPosition(registrations)

    res.json({
      data: rankedRegistrations,
      promoted_user_id: result.promoted_user_id,
      message: 'Pemain berhasil dipromosikan dari daftar tunggu.',
    })

    io.to(`event:${eventId}`).emit('registrations:updated', {
      event_id: eventId,
      registrations: rankedRegistrations,
      promoted_user_id: result.promoted_user_id,
    })
  }
)

  return eventsRouter
}
