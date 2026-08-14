import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

/**
 * Middleware: Validates the Supabase JWT Bearer token from the Authorization header.
 * Sets req.user if valid. Returns 401 if token is missing or invalid.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.replace('Bearer ', '')

  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
  }

  next()
}
