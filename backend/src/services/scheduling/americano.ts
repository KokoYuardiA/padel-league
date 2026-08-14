import { rotateCircle } from './roundRobin'
import { SchedulingError, TeamMatchup } from './types'

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)

// Americano: individual scoring, partners AND opponents rotate every round.
// Grouping is a different-shaped problem from team-vs-team scheduling, so
// this only reuses the low-level `rotateCircle` index permutation — each
// round it's applied to that round's active players to get a fresh order,
// then groups of 4 pick whichever internal team-split least repeats a past
// partnership (greedy, tracked via `partnerCount`/`opponentCount`).
export function generateAmericanoLogicalRounds(playerIds: string[]): TeamMatchup[][] {
  const n = playerIds.length
  if (n < 4) {
    throw new SchedulingError('INSUFFICIENT_PLAYERS', 'Americano requires at least 4 players')
  }

  const roundCount = clamp(n - 1, 3, 8)
  const remainder = n % 4

  const byeCount = new Map<string, number>(playerIds.map((id) => [id, 0]))
  const partnerCount = new Map<string, number>()
  const opponentCount = new Map<string, number>()

  const logicalRounds: TeamMatchup[][] = []

  for (let round = 0; round < roundCount; round++) {
    const sittingOut =
      remainder === 0
        ? []
        : [...playerIds]
            .sort((a, b) => {
              const byeDiff = (byeCount.get(a) ?? 0) - (byeCount.get(b) ?? 0)
              if (byeDiff !== 0) return byeDiff
              return playerIds.indexOf(a) - playerIds.indexOf(b)
            })
            .slice(0, remainder)

    sittingOut.forEach((id) => bump(byeCount, id))

    const sitOutSet = new Set(sittingOut)
    const active = playerIds.filter((id) => !sitOutSet.has(id))
    const order = rotateCircle(active.length, round).map((idx) => active[idx])

    const roundMatchups: TeamMatchup[] = []
    for (let i = 0; i < order.length; i += 4) {
      const [a, b, c, d] = order.slice(i, i + 4)

      const splits: Array<[[string, string], [string, string]]> = [
        [[a, b], [c, d]],
        [[a, c], [b, d]],
        [[a, d], [b, c]],
      ]

      let bestSplit = splits[0]
      let bestScore = Infinity
      for (const split of splits) {
        const [teamA, teamB] = split
        const partnerRepeatA = partnerCount.get(pairKey(teamA[0], teamA[1])) ?? 0
        const partnerRepeatB = partnerCount.get(pairKey(teamB[0], teamB[1])) ?? 0
        const opponentRepeat =
          (opponentCount.get(pairKey(teamA[0], teamB[0])) ?? 0) +
          (opponentCount.get(pairKey(teamA[0], teamB[1])) ?? 0) +
          (opponentCount.get(pairKey(teamA[1], teamB[0])) ?? 0) +
          (opponentCount.get(pairKey(teamA[1], teamB[1])) ?? 0)

        const score =
          Math.max(partnerRepeatA, partnerRepeatB) * 1000 +
          (partnerRepeatA + partnerRepeatB) * 10 +
          opponentRepeat

        if (score < bestScore) {
          bestScore = score
          bestSplit = split
        }
      }

      const [teamA, teamB] = bestSplit
      bump(partnerCount, pairKey(teamA[0], teamA[1]))
      bump(partnerCount, pairKey(teamB[0], teamB[1]))
      bump(opponentCount, pairKey(teamA[0], teamB[0]))
      bump(opponentCount, pairKey(teamA[0], teamB[1]))
      bump(opponentCount, pairKey(teamA[1], teamB[0]))
      bump(opponentCount, pairKey(teamA[1], teamB[1]))

      roundMatchups.push({ teamA, teamB })
    }

    logicalRounds.push(roundMatchups)
  }

  return logicalRounds
}
