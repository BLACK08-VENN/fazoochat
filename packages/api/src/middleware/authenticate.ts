import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../supabaseClient'

export interface AuthRequest extends Request {
  user?: { id: string; email?: string }
  accessToken?: string
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization')
  if (!authHeader) return res.status(401).json({ error: 'missing authorization' })
  const parts = authHeader.split(' ')
  if (parts.length !== 2) return res.status(401).json({ error: 'invalid authorization' })
  const token = parts[1]

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'invalid token' })
    req.user = { id: data.user.id, email: data.user.email || undefined }
    req.accessToken = token
    return next()
  } catch (err) {
    console.error('auth verify error', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
