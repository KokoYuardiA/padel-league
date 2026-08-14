import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import { CreateEventSchema, UpdateEventStatusSchema } from './routes/events.routes'
import { CreateGroupSchema, UpdateGroupSchema, UpdateMemberRoleSchema } from './routes/groups.routes'
import { SubmitScoreSchema, ConfirmScoreSchema, OverrideScoreSchema } from './routes/matches.routes'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase Auth session access token, sent as `Authorization: Bearer <token>`.',
})

const AUTH = [{ bearerAuth: [] }]

const ErrorResponse = z.object({ error: z.string() })
const DataResponse = z.object({ data: z.any() })

function ok(description: string, schema: z.ZodTypeAny = DataResponse) {
  return { description, content: { 'application/json': { schema } } }
}
function err(description: string) {
  return { description, content: { 'application/json': { schema: ErrorResponse } } }
}

const idParams = (name: string, description: string) =>
  z.object({ [name]: z.string().uuid().openapi({ description }) })

// ── Groups ─────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/groups',
  tags: ['Groups'],
  summary: 'List the groups the caller is a member of',
  security: AUTH,
  responses: { 200: ok('Groups the caller belongs to'), 401: err('Not authenticated') },
})

registry.registerPath({
  method: 'post',
  path: '/api/groups',
  tags: ['Groups'],
  summary: 'Create a new group (caller becomes Group Admin)',
  security: AUTH,
  request: { body: { content: { 'application/json': { schema: CreateGroupSchema } } } },
  responses: { 201: ok('Group created'), 400: err('Validation failed'), 401: err('Not authenticated') },
})

registry.registerPath({
  method: 'get',
  path: '/api/groups/{id}',
  tags: ['Groups'],
  summary: 'Get group detail (members, settings) — requires membership',
  security: AUTH,
  request: { params: idParams('id', 'Group id') },
  responses: { 200: ok('Group detail with members'), 403: err('Not a member of this group'), 404: err('Group not found') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/groups/{id}',
  tags: ['Groups'],
  summary: 'Edit group settings — Group Admin only',
  security: AUTH,
  request: { params: idParams('id', 'Group id'), body: { content: { 'application/json': { schema: UpdateGroupSchema } } } },
  responses: { 200: ok('Updated group'), 400: err('Validation failed'), 403: err('Group Admin only') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/groups/{id}/members/{userId}',
  tags: ['Groups'],
  summary: "Change a member's role (Player <-> Organizer) — Group Admin only",
  security: AUTH,
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: 'Group id' }),
      userId: z.string().uuid().openapi({ description: 'Target member user id' }),
    }),
    body: { content: { 'application/json': { schema: UpdateMemberRoleSchema } } },
  },
  responses: { 200: ok('Updated member'), 400: err('Invalid role / cannot change own or owner role'), 404: err('Member not found') },
})

registry.registerPath({
  method: 'delete',
  path: '/api/groups/{id}/members/{userId}',
  tags: ['Groups'],
  summary: 'Remove a member from the group — Group Admin only (cannot remove the owner)',
  security: AUTH,
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: 'Group id' }),
      userId: z.string().uuid().openapi({ description: 'Target member user id' }),
    }),
  },
  responses: { 204: { description: 'Member removed' }, 400: err('Cannot remove the group owner'), 404: err('Member not found') },
})

registry.registerPath({
  method: 'get',
  path: '/api/groups/join/{invite_code}/preview',
  tags: ['Groups'],
  summary: 'Preview a group by invite code before joining (no invite_code echoed back)',
  security: AUTH,
  request: { params: z.object({ invite_code: z.string().openapi({ description: 'Invite code from the invite link/QR' }) }) },
  responses: { 200: ok('Group preview: name, description, member_count, already_member, suspended_at'), 404: err('Invalid or expired invite code') },
})

registry.registerPath({
  method: 'post',
  path: '/api/groups/join/{invite_code}',
  tags: ['Groups'],
  summary: 'Join a group via invite code',
  security: AUTH,
  request: { params: z.object({ invite_code: z.string().openapi({ description: 'Invite code from the invite link/QR' }) }) },
  responses: {
    201: ok('Joined group'),
    403: err('Group is suspended'),
    404: err('Invalid or expired invite code'),
    409: err('Already a member of this group'),
  },
})

// ── Events ─────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/events',
  tags: ['Events'],
  summary: 'List events for a group the caller is a member of',
  security: AUTH,
  request: { query: z.object({ group_id: z.string().uuid() }) },
  responses: { 200: ok('Events in the group'), 400: err('group_id query parameter is required'), 403: err('Not a member of this group') },
})

registry.registerPath({
  method: 'post',
  path: '/api/events',
  tags: ['Events'],
  summary: 'Create a new event — Organizer/Group Admin only',
  security: AUTH,
  request: { body: { content: { 'application/json': { schema: CreateEventSchema } } } },
  responses: { 201: ok('Event created'), 400: err('Validation failed'), 403: err('Organizer/Group Admin only') },
})

registry.registerPath({
  method: 'get',
  path: '/api/events/{id}',
  tags: ['Events'],
  summary: 'Get event detail with registrations (waiting-list position server-computed)',
  security: AUTH,
  request: { params: idParams('id', 'Event id') },
  responses: { 200: ok('Event + registrations array'), 403: err('Not a member of this event\'s group'), 404: err('Event not found') },
})

registry.registerPath({
  method: 'post',
  path: '/api/events/{id}/register',
  tags: ['Events'],
  summary: 'Register the caller for an event (auto-waitlisted if at capacity)',
  security: AUTH,
  request: { params: idParams('id', 'Event id') },
  responses: {
    201: ok('Registration created (registered or waiting_list)'),
    400: err('Event not open, or Mixed Partner event without gender set on profile'),
    409: err('Already registered'),
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/events/{id}/status',
  tags: ['Events'],
  summary: 'Transition an event\'s status (Draft -> Open -> Full -> In Progress -> Completed/Cancelled) — Organizer/Group Admin only',
  security: AUTH,
  request: { params: idParams('id', 'Event id'), body: { content: { 'application/json': { schema: UpdateEventStatusSchema } } } },
  responses: { 200: ok('Updated event'), 400: err('Illegal transition for the current status'), 404: err('Event not found') },
})

registry.registerPath({
  method: 'post',
  path: '/api/events/{id}/withdraw',
  tags: ['Events'],
  summary: 'Withdraw the caller\'s own registration (auto-promotes the earliest waitlisted player if a spot opens)',
  security: AUTH,
  request: { params: idParams('id', 'Event id') },
  responses: {
    200: ok('Updated registrations + promoted_user_id'),
    400: err('Event not withdrawable in its current status'),
    404: err('Not registered for this event'),
    409: err('Already withdrawn'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/events/{id}/registrations/{registrationId}/promote',
  tags: ['Events'],
  summary: 'Manually promote a SPECIFIC waiting-list registration — Organizer/Group Admin only, capacity enforced (no override)',
  security: AUTH,
  request: {
    params: z.object({
      id: z.string().uuid().openapi({ description: 'Event id' }),
      registrationId: z.string().uuid().openapi({ description: 'Target registration id (must currently be waiting_list)' }),
    }),
  },
  responses: {
    200: ok('Updated registrations + promoted_user_id'),
    400: err('Event not promotable, or registration not on the waiting list'),
    404: err('Event or registration not found'),
    409: err('Event already at capacity (max_players) — no override'),
  },
})

// ── Schedule (mounted under /api/events) ────────────────────────────────
registry.registerPath({
  method: 'post',
  path: '/api/events/{id}/generate-schedule',
  tags: ['Schedule'],
  summary: 'Generate the match schedule for an event — Organizer/Group Admin only. One-time for Americano/Round Robin/Fixed Partner/Mixed Partner; round 1 only for Mexicano.',
  security: AUTH,
  request: { params: idParams('id', 'Event id') },
  responses: { 201: ok('Generated matches'), 400: err('Not enough players, wrong event status, or already generated'), 403: err('Organizer/Group Admin only') },
})

registry.registerPath({
  method: 'post',
  path: '/api/events/{id}/generate-next-round',
  tags: ['Schedule'],
  summary: 'Mexicano only: generate the next standings-driven round — Organizer/Group Admin only, requires every existing match confirmed',
  security: AUTH,
  request: { params: idParams('id', 'Event id') },
  responses: { 201: ok('Generated next round of matches'), 400: err('Not Mexicano, or a match is still unconfirmed'), 403: err('Organizer/Group Admin only') },
})

// ── Matches ────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/matches',
  tags: ['Matches'],
  summary: 'List all matches for an event',
  security: AUTH,
  request: { query: z.object({ event_id: z.string().uuid() }) },
  responses: { 200: ok('Matches for the event'), 400: err('event_id query parameter is required'), 403: err('Not a member of this event\'s group') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/matches/{id}/score',
  tags: ['Matches'],
  summary: 'Self-report a match score — either player in the match',
  security: AUTH,
  request: { params: idParams('id', 'Match id'), body: { content: { 'application/json': { schema: SubmitScoreSchema } } } },
  responses: { 200: ok('Updated match (pending_confirmation)'), 403: err('Not a player in this match'), 404: err('Match not found'), 409: err('Already pending confirmation') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/matches/{id}/confirm',
  tags: ['Matches'],
  summary: 'Confirm or dispute a pending score — only the designated confirming player',
  security: AUTH,
  request: { params: idParams('id', 'Match id'), body: { content: { 'application/json': { schema: ConfirmScoreSchema } } } },
  responses: { 200: ok('Updated match (confirmed or disputed, reopened for re-entry)'), 403: err('Not the designated confirming player'), 404: err('Match not found'), 409: err('Not awaiting confirmation') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/matches/{id}/override',
  tags: ['Matches'],
  summary: 'Organizer/Group Admin sets a score directly, bypassing player confirmation — immediately final',
  security: AUTH,
  request: { params: idParams('id', 'Match id'), body: { content: { 'application/json': { schema: OverrideScoreSchema } } } },
  responses: { 200: ok('Updated match (confirmed)'), 403: err('Organizer/Group Admin only'), 404: err('Match not found') },
})

// ── Players ────────────────────────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/players/me/stats',
  tags: ['Players'],
  summary: 'Caller\'s own aggregate stats + confirmed match history, across every group ever played in',
  security: AUTH,
  responses: { 200: ok('{ summary, matches }'), 401: err('Not authenticated') },
})

// ── Admin (Platform Admin only) ──────────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/admin/groups',
  tags: ['Admin'],
  summary: 'List every group platform-wide, with member counts — Platform Admin only',
  security: AUTH,
  responses: { 200: ok('All groups'), 403: err('Platform Admin access required') },
})

registry.registerPath({
  method: 'get',
  path: '/api/admin/users',
  tags: ['Admin'],
  summary: 'List every user platform-wide (auth + profile merged) — Platform Admin only',
  security: AUTH,
  responses: { 200: ok('All users'), 403: err('Platform Admin access required') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/admin/groups/{id}/suspend',
  tags: ['Admin'],
  summary: 'Suspend a group (full lockout for all members) — Platform Admin only',
  security: AUTH,
  request: { params: idParams('id', 'Group id') },
  responses: { 200: ok('Suspended group'), 403: err('Platform Admin access required'), 404: err('Group not found') },
})

registry.registerPath({
  method: 'patch',
  path: '/api/admin/groups/{id}/unsuspend',
  tags: ['Admin'],
  summary: 'Unsuspend a group — Platform Admin only',
  security: AUTH,
  request: { params: idParams('id', 'Group id') },
  responses: { 200: ok('Unsuspended group'), 403: err('Platform Admin access required'), 404: err('Group not found') },
})

// ── Public (Guest, unauthenticated) ──────────────────────────────────────
registry.registerPath({
  method: 'get',
  path: '/api/public/groups',
  tags: ['Public'],
  summary: 'List every public, non-suspended group — no auth required, no invite_code exposed',
  responses: { 200: ok('Public groups directory') },
})

registry.registerPath({
  method: 'get',
  path: '/api/public/groups/{id}',
  tags: ['Public'],
  summary: 'Public group preview + its public-facing events — no auth required. 404 for private/suspended/nonexistent alike.',
  request: { params: idParams('id', 'Group id') },
  responses: { 200: ok('Group preview + events'), 404: err('Group not found or not public') },
})

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: "Let's Play Padel League API",
      version: '1.0.0',
      description:
        "REST API for Let's Play Padel League — groups, events, scheduling, live matches, and platform administration. " +
        'Every authenticated route expects a Supabase Auth session access token as a Bearer token. ' +
        'Error responses are always `{ "error": string }`; success responses are always `{ "data": ... }` unless noted.',
    },
    servers: [{ url: '/', description: 'This server' }],
  })
}
