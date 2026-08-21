'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell from '../../components/AuthShell'
import { supabase } from '../../lib/supabaseClient'

const fieldClass = 'auth-input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) return setError(authError.message)
    router.push('/')
    router.refresh()
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={handleLogin} className="space-y-5">
        <label className="block"><span className="auth-label">Work email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className={fieldClass} placeholder="you@company.com" autoComplete="email" required /></label>
        <label className="block"><span className="flex items-center justify-between"><span className="auth-label">Password</span><button type="button" className="mb-2 text-xs text-white/30 transition hover:text-orange-300">Forgot password?</button></span><input type="password" value={password} onChange={event => setPassword(event.target.value)} className={fieldClass} placeholder="Enter your password" autoComplete="current-password" required /></label>
        {error ? <p className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs text-red-300/80" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading} className="auth-submit">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />Signing in…</> : <>Sign in <span>→</span></>}</button>
      </form>
    </AuthShell>
  )
}
