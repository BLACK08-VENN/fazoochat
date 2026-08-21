import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase URL or service key not provided. Server operations will fail if used.')
}

export function isSupabaseAdminConfigured() {
  if (SUPABASE_SERVICE_KEY.startsWith('sb_secret_')) return true
  if (SUPABASE_SERVICE_KEY.split('.').length !== 3) return false

  try {
    const payload = JSON.parse(Buffer.from(SUPABASE_SERVICE_KEY.split('.')[1], 'base64url').toString('utf8'))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export const supabaseAdmin = createClient(SUPABASE_URL || 'http://localhost', SUPABASE_SERVICE_KEY || 'dummy', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    // Keep PostgREST operations pinned to the server key even after auth token
    // verification calls on this long-lived client.
    headers: SUPABASE_SERVICE_KEY
      ? { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
      : undefined
  }
})
