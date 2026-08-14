export interface GeneratedMatchRow {
  round_number: number
  court_number: number
  team_a_player1: string
  team_a_player2: string | null
  team_b_player1: string
  team_b_player2: string | null
}

// One logical-round matchup — always doubles (2v2), whether the pair is
// formed fresh per round (Americano) or fixed for the whole event
// (Round Robin / Fixed Partner).
export interface TeamMatchup {
  teamA: [string, string]
  teamB: [string, string]
}

export type SchedulingErrorCode =
  | 'INSUFFICIENT_PLAYERS'
  | 'INSUFFICIENT_TEAMS'
  | 'UNSUPPORTED_FORMAT'
  | 'GENDER_RATIO_MISMATCH'
  | 'MISSING_GENDER'

export class SchedulingError extends Error {
  code: SchedulingErrorCode

  constructor(code: SchedulingErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'SchedulingError'
  }
}
