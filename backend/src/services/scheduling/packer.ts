import { GeneratedMatchRow, TeamMatchup } from './types'

// Flattens logical rounds (everyone's pairing for that "round") into physical
// `matches` rows: a logical round with more matchups than available courts
// splits into several physical rounds so no court ever hosts 2 matches at once.
// `round_number` increments monotonically across the whole event, not reset
// per logical round.
export function packIntoPhysicalRounds(
  logicalRounds: TeamMatchup[][],
  courtsCount: number,
  startRoundNumber = 0
): GeneratedMatchRow[] {
  const courts = Math.max(1, courtsCount)
  const rows: GeneratedMatchRow[] = []
  let roundNumber = startRoundNumber

  for (const logicalRound of logicalRounds) {
    for (let i = 0; i < logicalRound.length; i += courts) {
      roundNumber += 1
      const batch = logicalRound.slice(i, i + courts)
      batch.forEach((matchup, courtIndex) => {
        rows.push({
          round_number: roundNumber,
          court_number: courtIndex + 1,
          team_a_player1: matchup.teamA[0],
          team_a_player2: matchup.teamA[1] ?? null,
          team_b_player1: matchup.teamB[0],
          team_b_player2: matchup.teamB[1] ?? null,
        })
      })
    }
  }

  return rows
}
