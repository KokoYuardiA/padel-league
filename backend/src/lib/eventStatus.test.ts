import { describe, it, expect } from 'vitest'
import { EVENT_STATUSES, ALLOWED_TRANSITIONS, isValidStatusTransition } from './eventStatus'

describe('isValidStatusTransition', () => {
  it('allows every transition listed in ALLOWED_TRANSITIONS', () => {
    for (const from of EVENT_STATUSES) {
      for (const to of ALLOWED_TRANSITIONS[from]) {
        expect(isValidStatusTransition(from, to)).toBe(true)
      }
    }
  })

  it('rejects every transition not listed in ALLOWED_TRANSITIONS', () => {
    for (const from of EVENT_STATUSES) {
      for (const to of EVENT_STATUSES) {
        const expected = ALLOWED_TRANSITIONS[from].includes(to)
        expect(isValidStatusTransition(from, to)).toBe(expected)
      }
    }
  })

  it('Draft can move to Open or Cancelled, nothing else', () => {
    expect(isValidStatusTransition('Draft', 'Open')).toBe(true)
    expect(isValidStatusTransition('Draft', 'Cancelled')).toBe(true)
    expect(isValidStatusTransition('Draft', 'Full')).toBe(false)
    expect(isValidStatusTransition('Draft', 'In Progress')).toBe(false)
    expect(isValidStatusTransition('Draft', 'Completed')).toBe(false)
  })

  it('Open and Full can move to each other and to In Progress/Cancelled', () => {
    expect(isValidStatusTransition('Open', 'Full')).toBe(true)
    expect(isValidStatusTransition('Full', 'Open')).toBe(true)
    expect(isValidStatusTransition('Open', 'In Progress')).toBe(true)
    expect(isValidStatusTransition('Full', 'In Progress')).toBe(true)
    expect(isValidStatusTransition('Open', 'Draft')).toBe(false)
    expect(isValidStatusTransition('Full', 'Draft')).toBe(false)
  })

  it('In Progress can only move to Completed or Cancelled', () => {
    expect(isValidStatusTransition('In Progress', 'Completed')).toBe(true)
    expect(isValidStatusTransition('In Progress', 'Cancelled')).toBe(true)
    expect(isValidStatusTransition('In Progress', 'Open')).toBe(false)
    expect(isValidStatusTransition('In Progress', 'Full')).toBe(false)
    expect(isValidStatusTransition('In Progress', 'Draft')).toBe(false)
  })

  it('Completed and Cancelled are terminal — no transitions allowed at all', () => {
    for (const to of EVENT_STATUSES) {
      expect(isValidStatusTransition('Completed', to)).toBe(false)
      expect(isValidStatusTransition('Cancelled', to)).toBe(false)
    }
  })

  it('no status can transition to itself', () => {
    for (const status of EVENT_STATUSES) {
      expect(isValidStatusTransition(status, status)).toBe(false)
    }
  })
})
