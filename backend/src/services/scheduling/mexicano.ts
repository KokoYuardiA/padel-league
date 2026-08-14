import { SchedulingError, TeamMatchup } from './types'

export interface MexicanoEligiblePlayer {
  id: string
  registeredAt: string
}

export interface MexicanoHistoryRow {
  round_number: number
  created_at: string
  team_a_player1: string
  team_a_player2: string | null
  team_b_player1: string
  team_b_player2: string | null
  score_a: number | null
  score_b: number | null
  status: string
}

export interface MexicanoRoundResult {
  matchups: TeamMatchup[]
  benchedPlayerIds: string[]
}

const bump = (map: Map<string, number>, key: string, by = 1) => map.set(key, (map.get(key) ?? 0) + by)

function quartetKey(ids: string[]): string {
  return [...ids].sort().join(',')
}

function teamKey(team: [string, string]): string {
  return [...team].sort().join(',')
}

// Reused for round 1 (matchHistory=[]) and every subsequent wave — no
// first-round special-casing, since with empty history every eligible
// player is simply tied at 0 points / 0 games played.
export function generateMexicanoNextRound(
  eligiblePlayers: MexicanoEligiblePlayer[],
  courtsCount: number,
  matchHistory: MexicanoHistoryRow[]
): MexicanoRoundResult {
  const confirmed = matchHistory.filter((m) => m.status === 'confirmed')

  const points = new Map<string, number>()
  const gamesPlayed = new Map<string, number>()
  for (const m of confirmed) {
    const teamA = [m.team_a_player1, m.team_a_player2].filter((id): id is string => Boolean(id))
    const teamB = [m.team_b_player1, m.team_b_player2].filter((id): id is string => Boolean(id))
    for (const p of teamA) {
      bump(points, p, m.score_a ?? 0)
      bump(gamesPlayed, p)
    }
    for (const p of teamB) {
      bump(points, p, m.score_b ?? 0)
      bump(gamesPlayed, p)
    }
  }

  // Fairness denominator: waves that happened at/after each player's own
  // registration time — not the event-wide wave count, so a player who
  // joins mid-event isn't treated as having sat out waves before they
  // even existed.
  const roundTimestamps = new Map<number, string>()
  for (const m of confirmed) {
    const existing = roundTimestamps.get(m.round_number)
    if (!existing || m.created_at < existing) roundTimestamps.set(m.round_number, m.created_at)
  }
  const allRoundTimestamps = [...roundTimestamps.values()]

  const sitOutCount = (player: MexicanoEligiblePlayer): number => {
    const eligibleWaveCount = allRoundTimestamps.filter((ts) => ts >= player.registeredAt).length
    return eligibleWaveCount - (gamesPlayed.get(player.id) ?? 0)
  }

  const activeCount = Math.min(
    eligiblePlayers.length - (eligiblePlayers.length % 4),
    Math.floor(courtsCount) * 4
  )

  if (activeCount < 4) {
    throw new SchedulingError('INSUFFICIENT_PLAYERS', 'At least 4 active players (within court capacity) are required to generate a Mexicano round')
  }

  const benchCount = eligiblePlayers.length - activeCount
  const benchOrder = [...eligiblePlayers].sort((a, b) => {
    const diff = sitOutCount(a) - sitOutCount(b)
    if (diff !== 0) return diff
    return a.registeredAt.localeCompare(b.registeredAt)
  })
  const benched = new Set(benchOrder.slice(0, benchCount).map((p) => p.id))
  const active = eligiblePlayers.filter((p) => !benched.has(p.id))

  const ranked = [...active].sort((a, b) => {
    const pointsDiff = (points.get(b.id) ?? 0) - (points.get(a.id) ?? 0)
    if (pointsDiff !== 0) return pointsDiff
    const gamesDiff = (gamesPlayed.get(a.id) ?? 0) - (gamesPlayed.get(b.id) ?? 0)
    if (gamesDiff !== 0) return gamesDiff
    return a.registeredAt.localeCompare(b.registeredAt)
  })

  // Only the immediately preceding wave matters for repeat-avoidance —
  // avoids reaching for full-history tracking like americano.ts needs.
  const lastRoundNumber = confirmed.length > 0 ? Math.max(...confirmed.map((m) => m.round_number)) : null
  const previousWaveSplits = new Map<string, [string, string]>()
  if (lastRoundNumber !== null) {
    for (const m of confirmed) {
      if (m.round_number !== lastRoundNumber) continue
      const teamA = [m.team_a_player1, m.team_a_player2].filter((id): id is string => Boolean(id))
      const teamB = [m.team_b_player1, m.team_b_player2].filter((id): id is string => Boolean(id))
      const quartet = quartetKey([...teamA, ...teamB])
      previousWaveSplits.set(quartet, [teamKey(teamA as [string, string]), teamKey(teamB as [string, string])])
    }
  }

  const matchups: TeamMatchup[] = []
  for (let i = 0; i < ranked.length; i += 4) {
    const [r1, r2, r3, r4] = ranked.slice(i, i + 4).map((p) => p.id)

    let teamA: [string, string] = [r1, r4]
    let teamB: [string, string] = [r2, r3]

    const quartet = quartetKey([r1, r2, r3, r4])
    const prevSplit = previousWaveSplits.get(quartet)
    if (prevSplit) {
      const candidate = new Set([teamKey(teamA), teamKey(teamB)])
      const previous = new Set(prevSplit)
      const sameSplit = candidate.size === previous.size && [...candidate].every((k) => previous.has(k))
      if (sameSplit) {
        teamA = [r1, r3]
        teamB = [r2, r4]
      }
    }

    matchups.push({ teamA, teamB })
  }

  return { matchups, benchedPlayerIds: [...benched] }
}
