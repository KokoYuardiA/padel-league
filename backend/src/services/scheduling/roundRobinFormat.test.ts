import { describe, expect, it } from 'vitest'
import { generateRoundRobinLogicalRounds } from './roundRobinFormat'
import { SchedulingError } from './types'

function teamsOf(n: number): [string, string][] {
  return Array.from({ length: n }, (_, i) => [`t${i}a`, `t${i}b`] as [string, string])
}

function teamKey(team: [string, string]): string {
  return team[0]
}

describe('generateRoundRobinLogicalRounds', () => {
  it('4 teams: 3 rounds, all C(4,2)=6 pairs exactly once', () => {
    const teams = teamsOf(4)
    const rounds = generateRoundRobinLogicalRounds(teams)
    expect(rounds).toHaveLength(3)

    const seen = new Set<string>()
    for (const round of rounds) {
      const present = new Set<string>()
      for (const matchup of round) {
        const a = teamKey(matchup.teamA)
        const b = teamKey(matchup.teamB)
        present.add(a)
        present.add(b)
        seen.add([a, b].sort().join('|'))
      }
      expect(present.size).toBe(round.length * 2)
    }
    expect(seen.size).toBe(6)
  })

  it('10 teams: exactly 9 rounds (uncapped — no clamp applied)', () => {
    const rounds = generateRoundRobinLogicalRounds(teamsOf(10))
    expect(rounds).toHaveLength(9)
  })

  it('7 teams (odd): 7 rounds, every team byes exactly once, all C(7,2)=21 pairs exactly once', () => {
    const teams = teamsOf(7)
    const rounds = generateRoundRobinLogicalRounds(teams)
    expect(rounds).toHaveLength(7)

    const seen = new Map<string, number>()
    const playCount = new Map<string, number>(teams.map((t) => [teamKey(t), 0]))

    for (const round of rounds) {
      for (const matchup of round) {
        const a = teamKey(matchup.teamA)
        const b = teamKey(matchup.teamB)
        const key = [a, b].sort().join('|')
        seen.set(key, (seen.get(key) ?? 0) + 1)
        playCount.set(a, (playCount.get(a) ?? 0) + 1)
        playCount.set(b, (playCount.get(b) ?? 0) + 1)
      }
    }

    expect(seen.size).toBe(21)
    for (const count of seen.values()) expect(count).toBe(1)
    for (const count of playCount.values()) expect(count).toBe(6) // played every other team once, byed once
  })

  it('throws SchedulingError for fewer than 2 teams', () => {
    expect(() => generateRoundRobinLogicalRounds(teamsOf(1))).toThrow(SchedulingError)
    expect(() => generateRoundRobinLogicalRounds([])).toThrow(SchedulingError)
  })
})
