import { circleMethodPairs } from './roundRobin'
import { SchedulingError, TeamMatchup } from './types'

// "Every team plays every other team exactly once" is Round Robin's defining
// property (PRD §Round Robin) — every round the circle method produces is
// used, uncapped, regardless of how many teams that implies.
export function generateRoundRobinLogicalRounds(teams: [string, string][]): TeamMatchup[][] {
  if (teams.length < 2) {
    throw new SchedulingError('INSUFFICIENT_TEAMS', 'Round Robin requires at least 2 teams (4 players)')
  }

  return circleMethodPairs(teams.length).map((roundPairs) =>
    roundPairs
      .filter((pair): pair is [number, number] => pair[1] !== null)
      .map(([a, b]) => ({ teamA: teams[a], teamB: teams[b] }))
  )
}
