import { Router, Response } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth.middleware'
import { supabaseAdmin } from '../lib/supabase'

export const playersRouter = Router()

const MATCH_HISTORY_SELECT = `
  id, score_a, score_b, created_at,
  team_a_player1:profiles!matches_team_a_player1_fkey(id, full_name),
  team_a_player2:profiles!matches_team_a_player2_fkey(id, full_name),
  team_b_player1:profiles!matches_team_b_player1_fkey(id, full_name),
  team_b_player2:profiles!matches_team_b_player2_fkey(id, full_name),
  events(id, title, event_date, format, groups(id, name))
`

const MATCH_HISTORY_LIMIT = 200

interface PlayerRef {
  id: string
  full_name: string
}

interface MatchHistoryRow {
  id: string
  score_a: number | null
  score_b: number | null
  created_at: string
  team_a_player1: PlayerRef
  team_a_player2: PlayerRef | null
  team_b_player1: PlayerRef
  team_b_player2: PlayerRef | null
  events: {
    id: string
    title: string
    event_date: string
    format: string
    groups: { id: string; name: string }
  } | null
}

// ── GET /api/players/me/stats ──────────────────────────────────
// A player's own aggregate stats (wins/losses/points) and confirmed match
// history across every group they've ever played in. Self-scoped only — the
// query predicate always pins to the caller's own id, so this never exposes
// another player's data even though it spans multiple groups, and needs no
// requireGroupRole check.
playersRouter.get('/me/stats', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id

  const { data, error } = await supabaseAdmin
    .from('matches')
    .select(MATCH_HISTORY_SELECT)
    .eq('status', 'confirmed')
    .or(
      `team_a_player1.eq.${userId},team_a_player2.eq.${userId},team_b_player1.eq.${userId},team_b_player2.eq.${userId}`
    )
    .order('created_at', { ascending: false })
    .limit(MATCH_HISTORY_LIMIT)

  if (error) {
    res.status(500).json({ error: error.message })
    return
  }

  const rows = (data ?? []) as unknown as MatchHistoryRow[]

  const matches = rows
    .filter((m) => m.events !== null)
    .map((m) => {
      const onTeamA = [m.team_a_player1?.id, m.team_a_player2?.id].includes(userId)
      const myTeam = onTeamA
        ? [m.team_a_player1, m.team_a_player2]
        : [m.team_b_player1, m.team_b_player2]
      const opponentTeam = onTeamA
        ? [m.team_b_player1, m.team_b_player2]
        : [m.team_a_player1, m.team_a_player2]
      const myScore = (onTeamA ? m.score_a : m.score_b) ?? 0
      const opponentScore = (onTeamA ? m.score_b : m.score_a) ?? 0

      const result: 'win' | 'loss' | 'draw' =
        myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'draw'

      return {
        matchId: m.id,
        eventId: m.events!.id,
        eventTitle: m.events!.title,
        groupName: m.events!.groups?.name ?? 'Grup',
        eventDate: m.events!.event_date,
        format: m.events!.format,
        myScore,
        opponentScore,
        result,
        partner: myTeam.filter((p) => p?.id !== userId)[0] ?? null,
        opponents: opponentTeam.filter((p): p is PlayerRef => p !== null),
      }
    })

  const wins = matches.filter((m) => m.result === 'win').length
  const losses = matches.filter((m) => m.result === 'loss').length
  const draws = matches.filter((m) => m.result === 'draw').length
  const totalPoints = matches.reduce((sum, m) => sum + m.myScore, 0)
  const matchesPlayed = matches.length

  res.json({
    data: {
      summary: {
        matchesPlayed,
        wins,
        losses,
        draws,
        totalPoints,
        winRatePercent: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
      },
      matches,
    },
  })
})
