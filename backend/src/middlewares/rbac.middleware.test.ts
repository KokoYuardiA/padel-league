import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.mock is hoisted above imports, so the real `../lib/supabase` module
// (which throws if SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are unset) is
// never actually evaluated — vi.hoisted lets us reference the mock object
// from inside the (also hoisted) mock factory.
const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn() },
}))

vi.mock('../lib/supabase', () => ({ supabaseAdmin: supabaseAdminMock }))

import {
  requireGroupRole,
  groupIdFromParam,
  groupIdFromEventParam,
  ANY_GROUP_MEMBER,
  ORGANIZER_OR_ADMIN,
} from './rbac.middleware'
import type { AuthenticatedRequest } from './auth.middleware'
import type { Response } from 'express'

// A minimal fake of the Supabase fluent query builder: every chain method
// (select/eq) returns itself, and the terminal method (single/maybeSingle)
// resolves to the given result — enough to drive requireGroupRole's queries
// without a real Supabase client.
function chainResult(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  return chain
}

interface MockResponse {
  statusCode?: number
  jsonBody?: { error?: string }
  status(code: number): MockResponse
  json(body: { error?: string }): MockResponse
}

function makeReqResNext(params: Record<string, string> = {}) {
  const req = { params, query: {}, body: {}, user: { id: 'user-1' } } as unknown as AuthenticatedRequest
  const res: MockResponse = {
    status(code) {
      res.statusCode = code
      return res
    },
    json(body) {
      res.jsonBody = body
      return res
    },
  }
  const next = vi.fn()
  return { req, res, next, expressRes: res as unknown as Response }
}

beforeEach(() => {
  supabaseAdminMock.from.mockReset()
})

describe('requireGroupRole', () => {
  it('calls next() when the caller holds an allowed role and the group is not suspended', async () => {
    supabaseAdminMock.from.mockImplementation(() =>
      chainResult({ data: { role: 'Organizer', groups: { suspended_at: null } } })
    )
    const middleware = requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({ id: 'group-1' })

    await middleware(req, expressRes, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.statusCode).toBeUndefined()
  })

  it('rejects with 403 when the caller holds a role not in allowedRoles', async () => {
    supabaseAdminMock.from.mockImplementation(() =>
      chainResult({ data: { role: 'Player', groups: { suspended_at: null } } })
    )
    const middleware = requireGroupRole(ORGANIZER_OR_ADMIN, groupIdFromParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({ id: 'group-1' })

    await middleware(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })

  it('rejects with 403 when the caller is not a member of the group at all', async () => {
    supabaseAdminMock.from.mockImplementation(() => chainResult({ data: null }))
    const middleware = requireGroupRole(ANY_GROUP_MEMBER, groupIdFromParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({ id: 'group-1' })

    await middleware(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })

  it('rejects with 403 when the group is suspended, even with an allowed role', async () => {
    supabaseAdminMock.from.mockImplementation(() =>
      chainResult({ data: { role: 'Group Admin', groups: { suspended_at: '2026-01-01T00:00:00Z' } } })
    )
    const middleware = requireGroupRole(ANY_GROUP_MEMBER, groupIdFromParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({ id: 'group-1' })

    await middleware(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
    expect(res.jsonBody?.error).toMatch(/suspended/i)
  })

  it('rejects with 404 when resolveGroupId cannot resolve a group id at all', async () => {
    const middleware = requireGroupRole(ANY_GROUP_MEMBER, groupIdFromParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({}) // no `id` param -> resolver returns null

    await middleware(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(404)
    // Resolver failed before ever needing to query group_members.
    expect(supabaseAdminMock.from).not.toHaveBeenCalledWith('group_members')
  })

  it('rejects with 404 when groupIdFromEventParam cannot find the referenced event (distinct from the missing-param case)', async () => {
    supabaseAdminMock.from.mockImplementation((table: string) => {
      if (table === 'events') return chainResult({ data: null })
      throw new Error(`unexpected table: ${table}`)
    })
    const middleware = requireGroupRole(ANY_GROUP_MEMBER, groupIdFromEventParam('id'))
    const { req, res, next, expressRes } = makeReqResNext({ id: 'event-does-not-exist' })

    await middleware(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(404)
    expect(supabaseAdminMock.from).toHaveBeenCalledWith('events')
  })
})
