import { describe, expect, it } from 'vitest'
import { packIntoPhysicalRounds } from './packer'
import { TeamMatchup } from './types'

function matchup(a: string, b: string): TeamMatchup {
  return { teamA: [a, `${a}2`], teamB: [b, `${b}2`] }
}

describe('packIntoPhysicalRounds', () => {
  it('splits a 5-matchup logical round with courtsCount=2 into physical batches [2,2,1]', () => {
    const logicalRound = [matchup('a', 'b'), matchup('c', 'd'), matchup('e', 'f'), matchup('g', 'h'), matchup('i', 'j')]
    const rows = packIntoPhysicalRounds([logicalRound], 2)

    const byRound = new Map<number, number>()
    for (const row of rows) byRound.set(row.round_number, (byRound.get(row.round_number) ?? 0) + 1)

    expect([...byRound.entries()].sort()).toEqual([
      [1, 2],
      [2, 2],
      [3, 1],
    ])

    // court numbers restart at 1 within each physical round
    const round1Courts = rows.filter((r) => r.round_number === 1).map((r) => r.court_number)
    expect(round1Courts.sort()).toEqual([1, 2])
  })

  it('round_number continues incrementing across logical-round boundaries', () => {
    const logicalRounds = [
      [matchup('a', 'b'), matchup('c', 'd'), matchup('e', 'f')],
      [matchup('g', 'h'), matchup('i', 'j')],
    ]
    const rows = packIntoPhysicalRounds(logicalRounds, 3)

    const roundNumbers = [...new Set(rows.map((r) => r.round_number))].sort((a, b) => a - b)
    expect(roundNumbers).toEqual([1, 2]) // first logical round fits in 1 physical round (3<=3), second in another
  })

  it('courtsCount=1: one physical round per matchup', () => {
    const rows = packIntoPhysicalRounds([[matchup('a', 'b'), matchup('c', 'd')]], 1)
    expect(rows.map((r) => r.round_number)).toEqual([1, 2])
    expect(rows.every((r) => r.court_number === 1)).toBe(true)
  })

  it('courtsCount larger than a round matchup count: no gaps or phantom courts', () => {
    const rows = packIntoPhysicalRounds([[matchup('a', 'b')]], 4)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ round_number: 1, court_number: 1 })
  })

  it('startRoundNumber=5: resulting round_number starts at 6 (continues an existing event)', () => {
    const rows = packIntoPhysicalRounds([[matchup('a', 'b'), matchup('c', 'd')]], 2, 5)
    expect(rows.map((r) => r.round_number)).toEqual([6, 6])
  })
})
