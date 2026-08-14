import { describe, it, expect } from 'vitest'
import { computePromotionCutoff } from './promotionWindow'

describe('computePromotionCutoff', () => {
  it('uses the registration deadline when it is earlier than event start', () => {
    const cutoff = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00',
      registrationDeadline: '2026-08-18T10:00:00Z',
    })
    expect(cutoff.toISOString()).toBe('2026-08-18T10:00:00.000Z')
  })

  it('uses event start when the registration deadline is later than event start', () => {
    const cutoff = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00',
      registrationDeadline: '2026-08-21T10:00:00Z',
    })
    // 2026-08-20 18:00 WIB (+07:00) == 2026-08-20T11:00:00Z
    expect(cutoff.toISOString()).toBe('2026-08-20T11:00:00.000Z')
  })

  it('falls back to event start when no registration deadline is set', () => {
    const cutoff = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00',
      registrationDeadline: null,
    })
    expect(cutoff.toISOString()).toBe('2026-08-20T11:00:00.000Z')
  })

  it('handles both HH:MM and HH:MM:SS start_time formats identically', () => {
    const short = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00',
      registrationDeadline: null,
    })
    const long = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00:00',
      registrationDeadline: null,
    })
    expect(short.toISOString()).toBe(long.toISOString())
  })

  it('a moment just before the cutoff is still within the window, just after is not', () => {
    const cutoff = computePromotionCutoff({
      eventDate: '2026-08-20',
      startTime: '18:00',
      registrationDeadline: null,
    })
    const justBefore = new Date(cutoff.getTime() - 1000)
    const justAfter = new Date(cutoff.getTime() + 1000)
    expect(justBefore.getTime() < cutoff.getTime()).toBe(true)
    expect(justAfter.getTime() > cutoff.getTime()).toBe(true)
  })
})
