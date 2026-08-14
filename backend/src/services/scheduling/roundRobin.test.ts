import { describe, expect, it } from 'vitest'
import { circleMethodPairs } from './roundRobin'

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

describe('circleMethodPairs', () => {
  it('n=6 (even): 5 rounds, all C(6,2)=15 pairs exactly once, no byes', () => {
    const schedule = circleMethodPairs(6)
    expect(schedule).toHaveLength(5)

    const seen = new Map<string, number>()
    for (const round of schedule) {
      expect(round).toHaveLength(3)
      for (const [a, b] of round) {
        expect(b).not.toBeNull()
        const key = pairKey(a, b as number)
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
    }

    expect(seen.size).toBe(15)
    for (const count of seen.values()) expect(count).toBe(1)
  })

  it('n=5 (odd): 5 rounds, all C(5,2)=10 real pairs exactly once, each item byes exactly once', () => {
    const schedule = circleMethodPairs(5)
    expect(schedule).toHaveLength(5)

    const seen = new Map<string, number>()
    const byeCount = new Map<number, number>([0, 1, 2, 3, 4].map((i) => [i, 0]))

    for (const round of schedule) {
      // When b is null, `a` is the one WITHOUT a match this round (bye) — not present as playing.
      for (const [a, b] of round) {
        if (b === null) {
          byeCount.set(a, (byeCount.get(a) ?? 0) + 1)
          continue
        }
        const key = pairKey(a, b)
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
    }

    expect(seen.size).toBe(10)
    for (const count of seen.values()) expect(count).toBe(1)
    for (const count of byeCount.values()) expect(count).toBe(1)
  })

  it('n<2 returns an empty schedule', () => {
    expect(circleMethodPairs(0)).toEqual([])
    expect(circleMethodPairs(1)).toEqual([])
  })

  it('no entity appears twice within the same round', () => {
    for (const n of [4, 5, 6, 7, 8, 9]) {
      const schedule = circleMethodPairs(n)
      for (const round of schedule) {
        const ids = round.flatMap(([a, b]) => (b === null ? [a] : [a, b]))
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })
})
