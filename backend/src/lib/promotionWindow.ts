// PRD §4.1: auto-promote a waitlisted player "up until registration deadline
// or event start, whichever is earlier." event_date (DATE) and start_time
// (TIME) carry no explicit timezone in schema.sql — every event in this
// product runs in Indonesia, so they're interpreted as Asia/Jakarta local
// wall-clock time here. If this assumption ever changes, this is the only
// place to update.
const EVENT_TIMEZONE_OFFSET = '+07:00'

export function computePromotionCutoff(opts: {
  eventDate: string
  startTime: string
  registrationDeadline: string | null
}): Date {
  const time = opts.startTime.length === 5 ? `${opts.startTime}:00` : opts.startTime
  const eventStart = new Date(`${opts.eventDate}T${time}${EVENT_TIMEZONE_OFFSET}`)

  if (!opts.registrationDeadline) return eventStart

  const deadline = new Date(opts.registrationDeadline)
  return deadline < eventStart ? deadline : eventStart
}
