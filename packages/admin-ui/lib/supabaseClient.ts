import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!url || !anonKey) {
  // In dev, the example env will provide these. Do not throw; let the UI handle missing config.
  console.warn('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set')
}

export const supabase = createClient(url, anonKey)

export function getProfile() {
  return supabase.from('profiles').select('*').limit(1)
}
