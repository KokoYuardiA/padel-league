import { createClient } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

/**
 * Calls the Express backend at NEXT_PUBLIC_API_URL, attaching the current
 * Supabase session's access token as a Bearer token.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })

  let body: unknown = null
  const text = await res.text()
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!res.ok) {
    const hasErrorField = !!body && typeof body === 'object' && 'error' in body
    const message = hasErrorField
      ? String((body as { error: unknown }).error)
      : `Request failed with status ${res.status}`
    throw new ApiError(message, res.status, body)
  }

  return body as T
}
