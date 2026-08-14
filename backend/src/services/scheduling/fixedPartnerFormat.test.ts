import { describe, expect, it } from 'vitest'
import { generateFixedPartnerLogicalRounds } from './fixedPartnerFormat'
import { SchedulingError } from './types'

function teamsOf(n: number): [string, string][] {
  return Array.from({ length: n }, (_, i) => [`t${i}a`, `t${i}b`] as [string, string])
}

describe('generateFixedPartnerLogicalRounds', () => {
  it('4 teams (even): 3 rounds, no repeat opponents (coincides with full completion at this size)', () => {
    const rounds = generateFixedPartnerLogicalRounds(teamsOf(4))
    expect(rounds).toHaveLength(3)

    const seen = new Set<string>()
    for (const round of rounds) {
      for (const matchup of round) {
        const key = [matchup.teamA[0], matchup.teamB[0]].sort().join('|')
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('5 teams (odd): 4 rounds, byes rotate, no team double-booked in a round', () => {
    const rounds = generateFixedPartnerLogicalRounds(teamsOf(5))
    expect(rounds).toHaveLength(4)

    for (const round of rounds) {
      const present = round.flatMap((m) => [m.teamA[0], m.teamB[0]])
      expect(new Set(present).size).toBe(present.length)
    }
  })

  it('10 teams: exactly 8 rounds — clamp caps it below the 9 rounds full completion would need', () => {
    const rounds = generateFixedPartnerLogicalRounds(teamsOf(10))
    expect(rounds).toHaveLength(8)
  })

  it('throws SchedulingError for fewer than 2 teams', () => {
    expect(() => generateFixedPartnerLogicalRounds([])).toThrow(SchedulingError)
  })
})
