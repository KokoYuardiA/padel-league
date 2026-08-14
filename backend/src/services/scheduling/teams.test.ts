import { describe, expect, it } from 'vitest'
import { formMixedTeamsByRegistrationOrder, formTeamsByRegistrationOrder, MixedPartnerPlayer } from './teams'
import { SchedulingError } from './types'

describe('formTeamsByRegistrationOrder', () => {
  it('pairs consecutive registrants for an even count, preserving order', () => {
    const { teams, excludedPlayerId } = formTeamsByRegistrationOrder(['p1', 'p2', 'p3', 'p4'])
    expect(teams).toEqual([
      ['p1', 'p2'],
      ['p3', 'p4'],
    ])
    expect(excludedPlayerId).toBeNull()
  })

  it('excludes the most recently registered player for an odd count', () => {
    const { teams, excludedPlayerId } = formTeamsByRegistrationOrder(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(teams).toEqual([
      ['p1', 'p2'],
      ['p3', 'p4'],
    ])
    expect(excludedPlayerId).toBe('p5')
  })

  it('handles a single leftover player (odd count of 1)', () => {
    const { teams, excludedPlayerId } = formTeamsByRegistrationOrder(['p1'])
    expect(teams).toEqual([])
    expect(excludedPlayerId).toBe('p1')
  })
})

function mixedPlayer(id: string, gender: 'Male' | 'Female' | null, registeredAt: string): MixedPartnerPlayer {
  return { id, gender, registeredAt }
}

describe('formMixedTeamsByRegistrationOrder', () => {
  it('pairs Male/Female by registration order within each gender when counts match', () => {
    const players = [
      mixedPlayer('m1', 'Male', '1000'),
      mixedPlayer('f1', 'Female', '1001'),
      mixedPlayer('m2', 'Male', '1002'),
      mixedPlayer('f2', 'Female', '1003'),
    ]
    const teams = formMixedTeamsByRegistrationOrder(players)
    expect(teams).toEqual([
      ['m1', 'f1'],
      ['m2', 'f2'],
    ])
  })

  it('throws GENDER_RATIO_MISMATCH when Male/Female counts differ', () => {
    const players = [
      mixedPlayer('m1', 'Male', '1000'),
      mixedPlayer('m2', 'Male', '1001'),
      mixedPlayer('m3', 'Male', '1002'),
      mixedPlayer('f1', 'Female', '1003'),
    ]
    try {
      formMixedTeamsByRegistrationOrder(players)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(SchedulingError)
      expect((err as SchedulingError).code).toBe('GENDER_RATIO_MISMATCH')
    }
  })

  it('throws MISSING_GENDER when any eligible player has no gender set', () => {
    const players = [
      mixedPlayer('m1', 'Male', '1000'),
      mixedPlayer('f1', 'Female', '1001'),
      mixedPlayer('unset', null, '1002'),
    ]
    try {
      formMixedTeamsByRegistrationOrder(players)
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(SchedulingError)
      expect((err as SchedulingError).code).toBe('MISSING_GENDER')
    }
  })
})
