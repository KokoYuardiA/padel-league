import { describe, expect, it } from 'vitest'
import { generateSchedule } from './index'
import { SchedulingError } from './types'

function playersOf(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i}`)
}

describe('generateSchedule', () => {
  it('throws SchedulingError for fewer than 4 eligible players', () => {
    expect(() => generateSchedule('Americano', playersOf(3), 2)).toThrow(SchedulingError)
  })

  it('throws UNSUPPORTED_FORMAT for Mexicano / Mixed Partner', () => {
    try {
      generateSchedule('Mexicano', playersOf(8), 2)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(SchedulingError)
      expect((err as SchedulingError).code).toBe('UNSUPPORTED_FORMAT')
    }
  })

  it('Americano happy path: contiguous round_number/court_number, correct total match count', () => {
    const { rows, roundCount, excludedPlayerId } = generateSchedule('Americano', playersOf(8), 2)
    expect(excludedPlayerId).toBeNull()
    expect(roundCount).toBe(7)
    expect(rows).toHaveLength(7 * 2) // 2 matches per round, 7 rounds
    const roundNumbers = [...new Set(rows.map((r) => r.round_number))].sort((a, b) => a - b)
    expect(roundNumbers).toEqual(Array.from({ length: 7 }, (_, i) => i + 1))
  })

  it('Round Robin happy path: 8 players -> 4 teams -> 3 rounds, 6 matches total', () => {
    const { rows, roundCount, excludedPlayerId } = generateSchedule('Round Robin', playersOf(8), 4)
    expect(excludedPlayerId).toBeNull()
    expect(roundCount).toBe(3)
    expect(rows).toHaveLength(6) // C(4,2)
  })

  it('Fixed Partner happy path: 8 players -> 4 teams -> 3 rounds', () => {
    const { rows, roundCount } = generateSchedule('Fixed Partner', playersOf(8), 4)
    expect(roundCount).toBe(3)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('odd player count for a team format surfaces excludedPlayerId', () => {
    const { excludedPlayerId } = generateSchedule('Round Robin', playersOf(9), 4)
    expect(excludedPlayerId).toBe('p8')
  })
})
