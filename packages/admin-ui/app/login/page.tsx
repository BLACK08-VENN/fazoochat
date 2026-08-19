'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)', animation: 'float 6s ease-in-out infinite' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.06), transparent 70%)', animation: 'float 8s ease-in-out infinite 2s' }} />

      <div className="w-full max-w-md glass-futuristic rounded-2xl p-8 relative z-10 animate-fade-in-up">
        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none scan-line opacity-20" />

        <div className="flex items-center justify-center gap-3 mb-10 relative">
          <img src="/logo.svg" alt="" className="w-11 h-11" />
          <h1 className="text-3xl font-bold gradient-text-static">Fazoo</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative">
          <div>
            <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white/90 placeholder-white/20 text-sm transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white/90 placeholder-white/20 text-sm transition-all duration-300"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              required
            />
          </div>
          {error && (
            <p className="text-red-400/80 text-xs px-3 py-2 rounded-lg" style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.12)'
            }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full glow-btn text-white py-3 rounded-xl font-medium text-sm tracking-wide disabled:opacity-40 relative overflow-hidden mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
