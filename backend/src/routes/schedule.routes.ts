import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import { requireGroupRole, groupIdFromEventParam, ORGANIZER_OR_ADMIN } from '../middlewares/rbac.middleware'
import { supabaseAdmin } from '../lib/supabase'
import { generateSchedule, SchedulingError } from '../services/scheduling'
import { generateMexicanoNextRound, MexicanoHistoryRow } from '../services/scheduling/mexicano'
import { packIntoPhysicalRounds } from '../services/scheduling/packer'
import { formMixedTeamsByRegistrationOrder } from '../services/scheduling/teams'
import { generateFixedPartnerLogicalRounds } from '../services/scheduling/fixedPartnerFormat'

const MATCH_SELECT = `
  id, round_number, court_number, score_a, score_b, status, reported_by, needs_confirm_by, created_at,
  team_a_player1:profiles!matches_team_a_player1_fkey(id, full_name),
  team_a_player2:profiles!matches_team_a_player2_fkey(id, full_name),
  team_b_player1:profiles!matches_team_b_player1_fkey(id, full_name),
  team_b_player2:profiles!matches_team_b_player2_fkey(id, full_name)
`

const EVENT_STATUSES_ELIGIBLE_FOR_GENERATION = ['Open', 'Full', 'In Progress']
const ROUND_COUNT_WARNING_THRESHOLD = 12

function buildScheduleWarning(opts: {
  excludedPlayerId?: string | null
  benchedPlayerIds?: string[]
  roundCount?: number
}): string | undefined {
  const warnings: string[] = []
  if (opts.excludedPlayerId) {
    warnings.push('Odd number of registered players — one player (the most recent to register) did not get a team and was excluded from the schedule.')
  }
  if (opts.benchedPlayerIds && opts.benchedPlayerIds.length > 0) {
    warnings.push(`${opts.benchedPlayerIds.length} player(s) are sitting out this round due to court limits — they will be prioritized next round.`)
  }
  if (opts.roundCount && opts.roundCount > ROUND_COUNT_WARNING_THRESHOLD) {
    warnings.push(`This schedule has ${opts.roundCount} rounds — consider the court/player count for the next event.`)
  }
  return warnings.length > 0 ? warnings.join(' ') : undefined
}

export const scheduleRouter = Router()

  scheduleRouter.post(
    '/:id/generate-schedule',
    requireAuth,
    requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromEventParam('id')),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const eventId = req.params.id

      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('format, courts_count, status')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        res.status(404).json({ error: 'Event not found' })
        return
      }

      if (!EVENT_STATUSES_ELIGIBLE_FOR_GENERATION.includes(event.status)) {
        res.status(400).json({
          error: `Cannot generate a schedule while the event is '${event.status}'`,
          allowed: EVENT_STATUSES_ELIGIBLE_FOR_GENERATION,
        })
        return
      }

      // profiles!event_registrations_user_id_fkey disambiguates: event_registrations has two
      // FKs into profiles (user_id, partner_user_id), so an unqualified embed is ambiguous.
      const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from('event_registrations')
        .select('user_id, registered_at, profiles!event_registrations_user_id_fkey(gender)')
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('registered_at', { ascending: true })

      if (registrationsError) {
        res.status(500).json({ error: registrationsError.message })
        return
      }

      const eligiblePlayerIds = (registrations ?? []).map((r) => r.user_id as string)

      // Mexicano can't be computed upfront (round N+1 depends on round N's confirmed
      // standings) — its "first generation" is just round 1 with empty history, using
      // the same generateMexicanoNextRound() the incremental endpoint below reuses.
      // It's still routed through generate_event_schedule (migration 0003) since this
      // is still a "no matches exist yet" one-time creation, same as the other formats.
      let rows
      let warning: string | undefined
      if (event.format === 'Mexicano') {
        let mexicanoResult
        try {
          const eligiblePlayers = (registrations ?? []).map((r) => ({ id: r.user_id as string, registeredAt: r.registered_at as string }))
          mexicanoResult = generateMexicanoNextRound(eligiblePlayers, event.courts_count, [])
        } catch (err) {
          if (err instanceof SchedulingError) {
            res.status(400).json({ error: err.message, code: err.code })
            return
          }
          throw err
        }
        rows = packIntoPhysicalRounds([mexicanoResult.matchups], event.courts_count)
        warning = buildScheduleWarning({ benchedPlayerIds: mexicanoResult.benchedPlayerIds })
      } else if (event.format === 'Mixed Partner') {
        // Same fixed-team, opponents-rotate mechanics as Fixed Partner — the only
        // difference is gender-aware team formation, so the round-generation logic
        // (generateFixedPartnerLogicalRounds) is reused completely unchanged.
        try {
          const eligiblePlayers = (registrations ?? []).map((r) => ({
            id: r.user_id as string,
            gender: (r.profiles as unknown as { gender: 'Male' | 'Female' | null } | null)?.gender ?? null,
            registeredAt: r.registered_at as string,
          }))
          const teams = formMixedTeamsByRegistrationOrder(eligiblePlayers)
          rows = packIntoPhysicalRounds(generateFixedPartnerLogicalRounds(teams), event.courts_count)
        } catch (err) {
          if (err instanceof SchedulingError) {
            res.status(400).json({ error: err.message, code: err.code })
            return
          }
          throw err
        }
        warning = buildScheduleWarning({})
      } else {
        let generated
        try {
          generated = generateSchedule(event.format, eligiblePlayerIds, event.courts_count)
        } catch (err) {
          if (err instanceof SchedulingError) {
            res.status(400).json({ error: err.message, code: err.code })
            return
          }
          throw err
        }
        rows = generated.rows
        warning = buildScheduleWarning({ excludedPlayerId: generated.excludedPlayerId, roundCount: generated.roundCount })
      }

      const { error: rpcError } = await supabaseAdmin.rpc('generate_event_schedule', {
        p_event_id: eventId,
        p_matches: rows,
      })

      if (rpcError) {
        if (rpcError.message?.includes('EVENT_NOT_FOUND')) {
          res.status(404).json({ error: 'Event not found' })
        } else if (rpcError.message?.includes('SCHEDULE_ALREADY_EXISTS')) {
          res.status(409).json({ error: 'A schedule has already been generated for this event' })
        } else {
          res.status(500).json({ error: rpcError.message })
        }
        return
      }

      // Re-fetch with player names embedded so the response/broadcast shape matches GET /api/matches.
      const { data: matches, error: fetchError } = await supabaseAdmin
        .from('matches')
        .select(MATCH_SELECT)
        .eq('event_id', eventId)
        .order('round_number', { ascending: true })
        .order('court_number', { ascending: true })

      if (fetchError) {
        res.status(500).json({ error: fetchError.message })
        return
      }

      res.status(201).json({ data: matches, warning })
    }
  )

  // Mexicano-only: appends one more wave once every match so far is confirmed.
  // Doesn't go through generateSchedule()'s dispatcher (that's scoped to the 3
  // upfront-batch formats) — calls generateMexicanoNextRound() directly.
  scheduleRouter.post(
    '/:id/generate-next-round',
    requireAuth,
    requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromEventParam('id')),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const eventId = req.params.id

      const { data: event, error: eventError } = await supabaseAdmin
        .from('events')
        .select('format, courts_count, status')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        res.status(404).json({ error: 'Event not found' })
        return
      }

      if (event.format !== 'Mexicano') {
        res.status(400).json({ error: 'This endpoint only applies to the Mexicano format' })
        return
      }

      if (!EVENT_STATUSES_ELIGIBLE_FOR_GENERATION.includes(event.status)) {
        res.status(400).json({
          error: `Cannot generate a round while the event is '${event.status}'`,
          allowed: EVENT_STATUSES_ELIGIBLE_FOR_GENERATION,
        })
        return
      }

      const { data: existingMatches, error: matchesError } = await supabaseAdmin
        .from('matches')
        .select('round_number, created_at, status, team_a_player1, team_a_player2, team_b_player1, team_b_player2, score_a, score_b')
        .eq('event_id', eventId)

      if (matchesError) {
        res.status(500).json({ error: matchesError.message })
        return
      }

      if (!existingMatches || existingMatches.length === 0) {
        res.status(400).json({ error: 'No schedule exists yet for this event — use generate-schedule first' })
        return
      }

      const unconfirmed = existingMatches.filter((m) => m.status !== 'confirmed')
      if (unconfirmed.length > 0) {
        res.status(409).json({
          error: `${unconfirmed.length} match(es) not yet confirmed — finish confirming all scores for this round before generating the next round`,
        })
        return
      }

      const { data: registrations, error: registrationsError } = await supabaseAdmin
        .from('event_registrations')
        .select('user_id, registered_at')
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('registered_at', { ascending: true })

      if (registrationsError) {
        res.status(500).json({ error: registrationsError.message })
        return
      }

      const eligiblePlayers = (registrations ?? []).map((r) => ({ id: r.user_id as string, registeredAt: r.registered_at as string }))
      const lastRoundNumber = Math.max(...existingMatches.map((m) => m.round_number))
      const matchHistory: MexicanoHistoryRow[] = existingMatches as MexicanoHistoryRow[]

      let result
      try {
        result = generateMexicanoNextRound(eligiblePlayers, event.courts_count, matchHistory)
      } catch (err) {
        if (err instanceof SchedulingError) {
          res.status(400).json({ error: err.message, code: err.code })
          return
        }
        throw err
      }

      const rows = packIntoPhysicalRounds([result.matchups], event.courts_count, lastRoundNumber)

      const { error: rpcError } = await supabaseAdmin.rpc('generate_next_mexicano_round', {
        p_event_id: eventId,
        p_expected_last_round: lastRoundNumber,
        p_matches: rows,
      })

      if (rpcError) {
        if (rpcError.message?.includes('EVENT_NOT_FOUND')) {
          res.status(404).json({ error: 'Event not found' })
        } else if (rpcError.message?.includes('ROUND_STATE_CHANGED')) {
          res.status(409).json({ error: 'The next round was already created by another process — reload the page.' })
        } else if (rpcError.message?.includes('PREVIOUS_ROUND_NOT_CONFIRMED')) {
          res.status(409).json({ error: 'Not all matches in the previous round have been confirmed yet.' })
        } else {
          res.status(500).json({ error: rpcError.message })
        }
        return
      }

      const { data: matches, error: fetchError } = await supabaseAdmin
        .from('matches')
        .select(MATCH_SELECT)
        .eq('event_id', eventId)
        .order('round_number', { ascending: true })
        .order('court_number', { ascending: true })

      if (fetchError) {
        res.status(500).json({ error: fetchError.message })
        return
      }

      const warning = buildScheduleWarning({ benchedPlayerIds: result.benchedPlayerIds })

      res.status(201).json({ data: matches, warning })
    }
  )
