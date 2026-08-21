'use client'

import { useState } from 'react'
import AuthShell from '../../components/AuthShell'
import { supabase } from '../../lib/supabaseClient'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    setLoading(false)
    if (authError) return setError(authError.message)
    setSent(true)
  }

  return (
    <AuthShell mode="signup">
      {sent ? (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.055] p-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-400/10 text-xl text-emerald-300">✓</span>
          <h3 className="mt-4 text-lg font-semibold text-white">Check your inbox</h3>
          <p className="mt-2 text-sm leading-6 text-white/40">We sent a confirmation link to <span className="text-white/65">{email}</span>.</p>
        </div>
      ) : (
        <form onSubmit={handleSignup} className="space-y-4">
          <label className="block"><span className="auth-label">Your name</span><input value={name} onChange={event => setName(event.target.value)} className="auth-input" placeholder="Jane Wanjiku" autoComplete="name" required /></label>
          <label className="block"><span className="auth-label">Work email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} className="auth-input" placeholder="you@company.com" autoComplete="email" required /></label>
          <label className="block"><span className="auth-label">Password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} className="auth-input" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} required /></label>
          <label className="flex items-start gap-3 py-1 text-xs leading-5 text-white/30"><input type="checkbox" required className="mt-1 accent-orange-500" /><span>I agree to the Terms of Service and Privacy Policy.</span></label>
          {error ? <p className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs text-red-300/80" role="alert">{error}</p> : null}
          <button type="submit" disabled={loading} className="auth-submit">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />Creating workspace…</> : <>Create account <span>→</span></>}</button>
        </form>
      )}
    </AuthShell>
  )
}
