import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import {
  requireGroupRole,
  groupIdFromEventQuery,
  groupIdFromMatchParam,
  ANY_GROUP_MEMBER,
  ORGANIZER_OR_ADMIN,
} from '../middlewares/rbac.middleware'
import { supabaseAdmin } from '../lib/supabase'
import { z } from 'zod'

// ── PATCH /api/matches/:id/score ──────────────────────────────
export const SubmitScoreSchema = z.object({
  score_a: z.number().int().min(0),
  score_b: z.number().int().min(0),
})

// ── PATCH /api/matches/:id/confirm ───────────────────────────
export const ConfirmScoreSchema = z.object({
  action: z.enum(['confirm', 'dispute']),
})

// ── PATCH /api/matches/:id/override ────────────────────────────
export const OverrideScoreSchema = z.object({
  score_a: z.number().int().min(0),
  score_b: z.number().int().min(0),
})

export const matchesRouter = Router()

  // ── GET /api/matches?event_id=... ────────────────────────────
  // List all matches for an event
  matchesRouter.get(
    '/',
    requireAuth,
    (req, res, next) => {
      if (!req.query.event_id) {
        res.status(400).json({ error: 'event_id query parameter is required' })
        return
      }
      next()
    },
    requireGroupRole(ANY_GROUP_MEMBER, groupIdFromEventQuery('event_id')),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const eventId = req.query.event_id as string

      const { data, error } = await supabaseAdmin
        .from('matches')
        .select(`
          id, round_number, court_number, score_a, score_b, status, reported_by, needs_confirm_by, created_at,
          team_a_player1:profiles!matches_team_a_player1_fkey(id, full_name),
          team_a_player2:profiles!matches_team_a_player2_fkey(id, full_name),
          team_b_player1:profiles!matches_team_b_player1_fkey(id, full_name),
          team_b_player2:profiles!matches_team_b_player2_fkey(id, full_name)
        `)
        .eq('event_id', eventId)
        .order('round_number', { ascending: true })
        .order('court_number', { ascending: true })

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ data })
    }
  )

  // ── PATCH /api/matches/:id/score ──────────────────────────────
  // Submit a score for a match (self-reported by a player in the match)
  matchesRouter.patch('/:id/score', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const matchId = req.params.id

    const parsed = SubmitScoreSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }

    // Only players in this match can report the score (Organizer override handled separately)
    const isPlayerInMatch = [
      match.team_a_player1, match.team_a_player2,
      match.team_b_player1, match.team_b_player2,
    ].includes(userId)

    if (!isPlayerInMatch) {
      res.status(403).json({ error: 'Only players in this match can submit a score' })
      return
    }

    if (match.status === 'pending_confirmation') {
      res.status(409).json({ error: 'A score is already pending confirmation. Wait for the other player to confirm or dispute.' })
      return
    }

    // Determine the other player to confirm (pick someone from the team opposing the reporter)
    const reporterIsTeamA = [match.team_a_player1, match.team_a_player2].includes(userId)
    const opposingTeam = reporterIsTeamA
      ? [match.team_b_player1, match.team_b_player2]
      : [match.team_a_player1, match.team_a_player2]
    const needsConfirmBy = opposingTeam.find((id) => id && id !== userId)!

    const { data: updated, error } = await supabaseAdmin
      .from('matches')
      .update({
        ...parsed.data,
        status: 'pending_confirmation',
        reported_by: userId,
        needs_confirm_by: needsConfirmBy,
      })
      .eq('id', matchId)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.json({ data: updated })
  })

  // ── PATCH /api/matches/:id/confirm ───────────────────────────
  // Confirm or dispute a score (called by the player who needs to confirm)
  matchesRouter.patch('/:id/confirm', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.id
    const matchId = req.params.id

    const parsed = ConfirmScoreSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
      return
    }

    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }

    if (match.status !== 'pending_confirmation') {
      res.status(409).json({ error: 'This match is not awaiting confirmation' })
      return
    }

    // Either player on the designated team may confirm/dispute — not just the
    // one specific id stored in needs_confirm_by.
    const confirmerTeam = [match.team_a_player1, match.team_a_player2].includes(match.needs_confirm_by)
      ? [match.team_a_player1, match.team_a_player2]
      : [match.team_b_player1, match.team_b_player2]

    if (!confirmerTeam.includes(userId)) {
      res.status(403).json({ error: 'You are not on the team designated to confirm this score' })
      return
    }

    const { action } = parsed.data
    const newStatus = action === 'confirm' ? 'confirmed' : 'disputed'

    const updatePayload =
      action === 'confirm'
        ? { status: newStatus, needs_confirm_by: null }
        : { status: newStatus, score_a: null, score_b: null, reported_by: null, needs_confirm_by: null }

    const { data: updated, error } = await supabaseAdmin
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId)
      .select()
      .single()

    if (error) {
      res.status(500).json({ error: error.message })
      return
    }

    res.json({ data: updated })
  })

  // ── PATCH /api/matches/:id/override ────────────────────────────
  // Organizer/Group Admin sets a match's score directly, bypassing the
  // player self-report + confirm flow entirely (e.g. players unresponsive
  // or disagree). Result is immediately final — no confirmation needed.
  matchesRouter.patch(
    '/:id/override',
    requireAuth,
    requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromMatchParam('id')),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const matchId = req.params.id

      const parsed = OverrideScoreSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
        return
      }

      const { data: match } = await supabaseAdmin.from('matches').select('event_id').eq('id', matchId).single()
      if (!match) {
        res.status(404).json({ error: 'Match not found' })
        return
      }

      const { data: updated, error } = await supabaseAdmin
        .from('matches')
        .update({
          ...parsed.data,
          status: 'confirmed',
          reported_by: req.user!.id,
          needs_confirm_by: null,
        })
        .eq('id', matchId)
        .select()
        .single()

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      res.json({ data: updated })
    }
  )
