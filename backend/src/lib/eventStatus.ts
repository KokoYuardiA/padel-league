export const EVENT_STATUSES = ['Draft', 'Open', 'Full', 'In Progress', 'Completed', 'Cancelled'] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

// Only a fixed set of transitions is allowed; Completed/Cancelled are terminal.
export const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  Draft: ['Open', 'Cancelled'],
  Open: ['Full', 'In Progress', 'Cancelled'],
  Full: ['Open', 'In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

export function isValidStatusTransition(current: EventStatus, next: EventStatus): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next)
}
