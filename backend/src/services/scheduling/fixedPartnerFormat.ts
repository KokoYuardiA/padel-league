import { circleMethodPairs } from './roundRobin'
import { SchedulingError, TeamMatchup } from './types'

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

// PRD only requires "opponents rotate" for Fixed Partner, not full
// round-robin completion — unlike Round Robin, so the schedule is capped to
// a sane bounded length instead of running (teams-1) rounds unconditionally.
export function generateFixedPartnerLogicalRounds(teams: [string, string][]): TeamMatchup[][] {
  if (teams.length < 2) {
    throw new SchedulingError('INSUFFICIENT_TEAMS', 'Fixed Partner requires at least 2 teams (4 players)')
  }

  const roundsToUse = clamp(teams.length - 1, 3, 8)

  return circleMethodPairs(teams.length)
    .slice(0, roundsToUse)
    .map((roundPairs) =>
      roundPairs
        .filter((pair): pair is [number, number] => pair[1] !== null)
        .map(([a, b]) => ({ teamA: teams[a], teamB: teams[b] }))
    )
}
