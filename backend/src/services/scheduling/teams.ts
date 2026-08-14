import { SchedulingError } from './types'

// Auto-pairs eligible players into fixed teams by registration order — no
// partner-selection UI exists, so consecutive registrants become a team.
// An odd player out (the most recently registered) is excluded, not benched
// forever: the caller surfaces `excludedPlayerId` as a response warning.
export function formTeamsByRegistrationOrder(
  sortedPlayerIds: string[]
): { teams: [string, string][]; excludedPlayerId: string | null } {
  const teams: [string, string][] = []
  const pairableCount = sortedPlayerIds.length - (sortedPlayerIds.length % 2)

  for (let i = 0; i < pairableCount; i += 2) {
    teams.push([sortedPlayerIds[i], sortedPlayerIds[i + 1]])
  }

  const excludedPlayerId =
    sortedPlayerIds.length % 2 === 1 ? sortedPlayerIds[sortedPlayerIds.length - 1] : null

  return { teams, excludedPlayerId }
}

export interface MixedPartnerPlayer {
  id: string
  gender: 'Male' | 'Female' | null
  registeredAt: string
}

// Mixed Partner needs gender-balanced teams (PRD: "mixed team required per
// match") — no partner-selection UI here either, so each gender bucket is
// paired up by registration order, mirroring formTeamsByRegistrationOrder's
// no-UI convention. Unlike that function, an imbalance isn't excluded with a
// warning — it's a hard error, per product decision: the organizer must reach
// an equal Male/Female count before a schedule can be generated at all.
export function formMixedTeamsByRegistrationOrder(players: MixedPartnerPlayer[]): [string, string][] {
  if (players.some((p) => !p.gender)) {
    throw new SchedulingError(
      'MISSING_GENDER',
      'One or more registered players have not set their gender — they must complete their profile before a Mixed Partner schedule can be generated'
    )
  }

  const sorted = [...players].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
  const males = sorted.filter((p) => p.gender === 'Male')
  const females = sorted.filter((p) => p.gender === 'Female')

  if (males.length !== females.length) {
    throw new SchedulingError(
      'GENDER_RATIO_MISMATCH',
      `Mixed Partner requires an equal number of Male and Female registered players (currently ${males.length} Male, ${females.length} Female)`
    )
  }

  return males.map((m, i) => [m.id, females[i].id] as [string, string])
}
