import { vi, describe, it, expect, beforeEach } from 'vitest'

const { supabaseAdminMock } = vi.hoisted(() => ({
  supabaseAdminMock: { from: vi.fn() },
}))

vi.mock('../lib/supabase', () => ({ supabaseAdmin: supabaseAdminMock }))

import { requirePlatformAdmin } from './admin.middleware'
import type { AuthenticatedRequest } from './auth.middleware'
import type { Response } from 'express'

function chainResult(result: { data: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => Promise.resolve(result))
  return chain
}

interface MockResponse {
  statusCode?: number
  jsonBody?: { error?: string }
  status(code: number): MockResponse
  json(body: { error?: string }): MockResponse
}

function makeReqResNext() {
  const req = { params: {}, query: {}, body: {}, user: { id: 'user-1' } } as unknown as AuthenticatedRequest
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

describe('requirePlatformAdmin', () => {
  it('calls next() when a platform_admins row exists for the caller', async () => {
    supabaseAdminMock.from.mockImplementation(() => chainResult({ data: { user_id: 'user-1' } }))
    const { req, res, next, expressRes } = makeReqResNext()

    await requirePlatformAdmin(req, expressRes, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.statusCode).toBeUndefined()
  })

  it('rejects with 403 when no platform_admins row exists for the caller', async () => {
    supabaseAdminMock.from.mockImplementation(() => chainResult({ data: null }))
    const { req, res, next, expressRes } = makeReqResNext()

    await requirePlatformAdmin(req, expressRes, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
  })
})
