import { formTeamsByRegistrationOrder } from './teams'
import { generateAmericanoLogicalRounds } from './americano'
import { generateRoundRobinLogicalRounds } from './roundRobinFormat'
import { generateFixedPartnerLogicalRounds } from './fixedPartnerFormat'
import { packIntoPhysicalRounds } from './packer'
import { GeneratedMatchRow, SchedulingError, TeamMatchup } from './types'

export { SchedulingError } from './types'
export type { SchedulingErrorCode, GeneratedMatchRow, TeamMatchup } from './types'

const SUPPORTED_FORMATS = ['Americano', 'Round Robin', 'Fixed Partner'] as const
type SupportedFormat = (typeof SUPPORTED_FORMATS)[number]

export interface GenerateScheduleResult {
  rows: GeneratedMatchRow[]
  excludedPlayerId: string | null
  roundCount: number
}

// Single entry point: pure, no Supabase import anywhere under services/scheduling/.
export function generateSchedule(
  format: string,
  eligiblePlayerIds: string[],
  courtsCount: number
): GenerateScheduleResult {
  if (eligiblePlayerIds.length < 4) {
    throw new SchedulingError('INSUFFICIENT_PLAYERS', 'At least 4 registered players are required to generate a schedule')
  }

  if (!SUPPORTED_FORMATS.includes(format as SupportedFormat)) {
    throw new SchedulingError('UNSUPPORTED_FORMAT', `Schedule generation is not implemented for format '${format}' yet`)
  }

  let logicalRounds: TeamMatchup[][]
  let excludedPlayerId: string | null = null

  if (format === 'Americano') {
    logicalRounds = generateAmericanoLogicalRounds(eligiblePlayerIds)
  } else {
    const { teams, excludedPlayerId: excluded } = formTeamsByRegistrationOrder(eligiblePlayerIds)
    excludedPlayerId = excluded
    logicalRounds =
      format === 'Round Robin'
        ? generateRoundRobinLogicalRounds(teams)
        : generateFixedPartnerLogicalRounds(teams)
  }

  const rows = packIntoPhysicalRounds(logicalRounds, courtsCount)

  return { rows, excludedPlayerId, roundCount: logicalRounds.length }
}
