// Textbook "circle method" round-robin scheduling: fix item 0, rotate the rest
// one position per round, pair symmetric positions (0<->n-1, 1<->n-2, ...).
// Operates on plain 0-based indices — callers map indices back to real IDs.

export type Pairing = [number, number | null]

// Returns a length-n permutation of 0..n-1: position 0 always holds index 0
// (fixed), positions 1..n-1 are the rest rotated right by `round` steps.
export function rotateCircle(n: number, round: number): number[] {
  if (n <= 1) return Array.from({ length: n }, (_, i) => i)
  const rest = Array.from({ length: n - 1 }, (_, i) => i + 1)
  const shift = round % rest.length
  const rotated = shift === 0 ? rest : [...rest.slice(rest.length - shift), ...rest.slice(0, rest.length - shift)]
  return [0, ...rotated]
}

// Full round-robin schedule for n entities (0..n-1). Odd n is padded with a
// bye slot (represented as `null` in the resulting pairs, never emitted as a
// real pairing) so every entity still gets exactly one bye across the schedule.
export function circleMethodPairs(n: number): Pairing[][] {
  if (n < 2) return []

  const isOdd = n % 2 === 1
  const padded = isOdd ? n + 1 : n
  const byeIndex = isOdd ? n : null
  const numRounds = padded - 1

  const rounds: Pairing[][] = []
  for (let round = 0; round < numRounds; round++) {
    const order = rotateCircle(padded, round)
    const roundPairs: Pairing[] = []
    for (let i = 0; i < padded / 2; i++) {
      const a = order[i]
      const b = order[padded - 1 - i]
      roundPairs.push([a === byeIndex ? b : a, a === byeIndex || b === byeIndex ? null : b])
    }
    rounds.push(roundPairs)
  }
  return rounds
}
