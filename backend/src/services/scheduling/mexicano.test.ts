import { describe, expect, it } from 'vitest'
import { generateMexicanoNextRound, MexicanoEligiblePlayer, MexicanoHistoryRow } from './mexicano'
import { SchedulingError } from './types'

function playersOf(n: number, baseTime = 1000): MexicanoEligiblePlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, registeredAt: String(baseTime + i) }))
}

function confirmedMatch(
  round: number,
  createdAt: string,
  teamA: [string, string],
  teamB: [string, string],
  scoreA: number,
  scoreB: number
): MexicanoHistoryRow {
  return {
    round_number: round,
    created_at: createdAt,
    team_a_player1: teamA[0],
    team_a_player2: teamA[1],
    team_b_player1: teamB[0],
    team_b_player2: teamB[1],
    score_a: scoreA,
    score_b: scoreB,
    status: 'confirmed',
  }
}

describe('generateMexicanoNextRound', () => {
  it('round 1 (empty history): n=8 courts=2 -> 2 quartets by registration order, split [r1,r4]/[r2,r3]', () => {
    const players = playersOf(8)
    const { matchups, benchedPlayerIds } = generateMexicanoNextRound(players, 2, [])

    expect(benchedPlayerIds).toHaveLength(0)
    expect(matchups).toHaveLength(2)
    expect(matchups[0]).toEqual({ teamA: ['p0', 'p3'], teamB: ['p1', 'p2'] })
    expect(matchups[1]).toEqual({ teamA: ['p4', 'p7'], teamB: ['p5', 'p6'] })
  })

  it('subsequent wave: quartets group by descending points from confirmed history', () => {
    const players = playersOf(8, 2000)
    const history: MexicanoHistoryRow[] = [
      confirmedMatch(1, '1000', ['p0', 'p1'], ['p2', 'p3'], 21, 5),
      confirmedMatch(1, '1000', ['p4', 'p5'], ['p6', 'p7'], 10, 15),
    ]
    const { matchups } = generateMexicanoNextRound(players, 2, history)

    // p0(21),p1(21) top; p6(15),p7(15) next; p2(5),p3(5) then; p4(10),p5(10) placed by points too
    // ranking desc: p0=21,p1=21,p6=15,p7=15,p4=10,p5=10,p2=5,p3=5 (ties broken by registeredAt)
    const allIds = matchups.flatMap((m) => [...m.teamA, ...m.teamB])
    expect(new Set(allIds).size).toBe(8)
    // Highest scorers p0/p1 must be in the first quartet (grouped with the next-highest tier)
    const firstQuartet = new Set([...matchups[0].teamA, ...matchups[0].teamB])
    expect(firstQuartet.has('p0')).toBe(true)
    expect(firstQuartet.has('p1')).toBe(true)
  })

  it('court capacity: n=12 courts=2 -> activeCount=8, 4 benched; benching rotates across waves', () => {
    const players = playersOf(12, 3000)

    const wave1 = generateMexicanoNextRound(players, 2, [])
    expect(wave1.benchedPlayerIds).toHaveLength(4)

    // created_at is deliberately later than every player's registeredAt ("30xx") so this wave
    // correctly counts as an eligible wave for all 12 players when computing sitOutCount below.
    const wave1History: MexicanoHistoryRow[] = wave1.matchups.map((m, i) =>
      confirmedMatch(1, '3999', m.teamA, m.teamB, 21 - i, 10 + i)
    )
    const wave2 = generateMexicanoNextRound(players, 2, wave1History)
    expect(wave2.benchedPlayerIds).toHaveLength(4)

    // Fairness: nobody benched in both consecutive waves while other candidates existed
    const benchedTwice = wave1.benchedPlayerIds.filter((id) => wave2.benchedPlayerIds.includes(id))
    expect(benchedTwice).toHaveLength(0)
  })

  it('late joiner: sitOutCount is not inflated by waves that happened before they registered', () => {
    // A,B play both prior waves (true sitOutCount=0). C,D,X,Y each play exactly one of the two
    // prior waves (true sitOutCount=1). E registers AFTER both waves (true sitOutCount=0, since
    // no wave has happened since they joined). Pool of 7, courts=1 -> activeCount=4, benchCount=3.
    // Fair ranking benches the three true-sitOutCount=0 players {A,B,E} exactly. The pre-fix bug
    // (using the event-wide wave count instead of each player's own eligible-wave count) would
    // have inflated E's sitOutCount to 2 -- worse than C/D/X/Y's true 1 -- wrongly protecting E
    // from benching and benching one of C/D/X/Y instead, whose true sitOutCount is genuinely lower
    // (more deserving of staying benched) than E's.
    // Fixed-width, zero-padded timestamps -- real Postgres timestamptz strings are fixed-width
    // ISO 8601, and sitOutCount relies on lexical string comparison matching numeric/chronological
    // order (same assumption the frontend already makes for `registered_at` ordering elsewhere).
    const A: MexicanoEligiblePlayer = { id: 'A', registeredAt: '00500' }
    const B: MexicanoEligiblePlayer = { id: 'B', registeredAt: '00600' }
    const C: MexicanoEligiblePlayer = { id: 'C', registeredAt: '00700' }
    const D: MexicanoEligiblePlayer = { id: 'D', registeredAt: '00800' }
    const X: MexicanoEligiblePlayer = { id: 'X', registeredAt: '00900' }
    const Y: MexicanoEligiblePlayer = { id: 'Y', registeredAt: '00950' }
    const E: MexicanoEligiblePlayer = { id: 'E', registeredAt: '02500' } // after both waves below

    const history: MexicanoHistoryRow[] = [
      confirmedMatch(1, '01000', ['A', 'C'], ['B', 'D'], 10, 10), // C,D play wave 1, X,Y sit out
      confirmedMatch(2, '02000', ['A', 'X'], ['B', 'Y'], 10, 10), // X,Y play wave 2, C,D sit out
    ]

    const { benchedPlayerIds } = generateMexicanoNextRound([A, B, C, D, X, Y, E], 1, history)

    expect([...benchedPlayerIds].sort()).toEqual(['A', 'B', 'E'])
  })

  it('anti-duplicate-matchup: same quartet reforming with the same rank split gets the alternate split', () => {
    // Constructed so that after 3 rounds of history, the standings-driven default split for the
    // next wave exactly reproduces the most recent wave's split ([p0,p3] vs [p1,p2]) -- the
    // "stable leaderboard" scenario flagged during design review. The override must kick in.
    const players = playersOf(4, 5000)
    const history: MexicanoHistoryRow[] = [
      confirmedMatch(1, '1000', ['p0', 'p1'], ['p2', 'p3'], 20, 0),
      confirmedMatch(2, '2000', ['p0', 'p2'], ['p1', 'p3'], 10, 0),
      confirmedMatch(3, '3000', ['p0', 'p3'], ['p1', 'p2'], 8, 2),
    ]
    // Cumulative: p0=38, p1=22, p2=12, p3=8 -> ranked [p0,p1,p2,p3].
    // Default split (r1,r4)/(r2,r3) = [p0,p3]/[p1,p2] -- identical to round 3's actual split.

    const { matchups } = generateMexicanoNextRound(players, 1, history)
    expect(matchups).toHaveLength(1)

    const teamAKeys = [...matchups[0].teamA].sort()
    const teamBKeys = [...matchups[0].teamB].sort()
    expect([teamAKeys, teamBKeys]).not.toEqual([['p0', 'p3'], ['p1', 'p2']])
    // The alternate split for this quartet/rank-order is [p0,p2]/[p1,p3].
    expect([teamAKeys, teamBKeys]).toEqual([['p0', 'p2'], ['p1', 'p3']])
  })

  it('throws SchedulingError when fewer than 4 eligible players', () => {
    expect(() => generateMexicanoNextRound(playersOf(3), 2, [])).toThrow(SchedulingError)
  })

  it('throws SchedulingError when court capacity caps active players below 4', () => {
    expect(() => generateMexicanoNextRound(playersOf(8), 0, [])).toThrow(SchedulingError)
  })

  it('no player double-booked within a generated wave', () => {
    const players = playersOf(12, 6000)
    const { matchups } = generateMexicanoNextRound(players, 3, [])
    const ids = matchups.flatMap((m) => [...m.teamA, ...m.teamB])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
