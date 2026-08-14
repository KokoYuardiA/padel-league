import { describe, expect, it } from 'vitest'
import { generateAmericanoLogicalRounds } from './americano'
import { SchedulingError } from './types'

function playersOf(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i}`)
}

function partnerKey(team: [string, string]): string {
  return [...team].sort().join('|')
}

describe('generateAmericanoLogicalRounds', () => {
  it('n=4: 3 rounds, each a distinct team split, all C(4,2)=6 pairs used as partners exactly once', () => {
    const rounds = generateAmericanoLogicalRounds(playersOf(4))
    expect(rounds).toHaveLength(3)

    const partnerships: string[] = []
    for (const round of rounds) {
      expect(round).toHaveLength(1)
      const [matchup] = round
      partnerships.push(partnerKey(matchup.teamA), partnerKey(matchup.teamB))
    }
    // 4 players only have 3 possible ways to split into 2 teams of 2; using all
    // 3 splits across the 3 rounds means every one of the 6 possible pairs
    // partners together exactly once — the optimal outcome for this size.
    expect(new Set(partnerships).size).toBe(6)
    expect(partnerships).toHaveLength(6)
  })

  it('n=8: 7 rounds, 2 courts/round, no player double-booked within a round', () => {
    const players = playersOf(8)
    const rounds = generateAmericanoLogicalRounds(players)
    expect(rounds).toHaveLength(7)

    for (const round of rounds) {
      expect(round).toHaveLength(2)
      const ids = round.flatMap((m) => [...m.teamA, ...m.teamB])
      expect(new Set(ids).size).toBe(8) // all 8 players appear, none twice
    }
  })

  it('n=6 (remainder 2): bye distribution is fair (max-min <= 1), every match has 4 distinct players', () => {
    const players = playersOf(6)
    const rounds = generateAmericanoLogicalRounds(players)

    const byeCount = new Map<string, number>(players.map((p) => [p, 0]))
    for (const round of rounds) {
      const present = new Set(round.flatMap((m) => [...m.teamA, ...m.teamB]))
      for (const p of players) if (!present.has(p)) byeCount.set(p, (byeCount.get(p) ?? 0) + 1)

      for (const m of round) {
        const ids = [...m.teamA, ...m.teamB]
        expect(new Set(ids).size).toBe(4)
      }
    }

    const counts = [...byeCount.values()]
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('n=5 (remainder 1): bye distribution is fair, every match has 4 distinct players', () => {
    const players = playersOf(5)
    const rounds = generateAmericanoLogicalRounds(players)

    const byeCount = new Map<string, number>(players.map((p) => [p, 0]))
    for (const round of rounds) {
      const present = new Set(round.flatMap((m) => [...m.teamA, ...m.teamB]))
      for (const p of players) if (!present.has(p)) byeCount.set(p, (byeCount.get(p) ?? 0) + 1)

      for (const m of round) {
        const ids = [...m.teamA, ...m.teamB]
        expect(new Set(ids).size).toBe(4)
      }
    }

    const counts = [...byeCount.values()]
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })

  it('throws SchedulingError for fewer than 4 players', () => {
    expect(() => generateAmericanoLogicalRounds(playersOf(3))).toThrow(SchedulingError)
  })
})
