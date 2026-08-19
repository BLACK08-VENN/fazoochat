'use client'

import { useEffect, useState } from 'react'
import { isApiConfigured, checkApiConnection } from '../lib/api'

export default function ApiBanner() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down' | 'unconfigured'>('checking')

  useEffect(() => {
    if (!isApiConfigured()) {
      setStatus('unconfigured')
      return
    }
    checkApiConnection().then(ok => setStatus(ok ? 'ok' : 'down'))
  }, [])

  if (status === 'checking' || status === 'ok') return null

  const isUnconfigured = status === 'unconfigured'

  return (
    <div
      className="mx-6 mt-4 px-4 py-3 rounded-xl text-[12px] font-medium tracking-wide flex items-center gap-3 animate-fade-in"
      style={{
        background: isUnconfigured ? 'rgba(251,191,36,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isUnconfigured ? 'rgba(251,191,36,0.12)' : 'rgba(239,68,68,0.12)'}`,
        color: isUnconfigured ? 'rgba(251,191,36,0.8)' : 'rgba(239,68,68,0.8)',
        boxShadow: isUnconfigured ? '0 0 20px rgba(251,191,36,0.05)' : '0 0 20px rgba(239,68,68,0.05)'
      }}
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{
        background: isUnconfigured ? '#fbbf24' : '#ef4444',
        boxShadow: `0 0 8px ${isUnconfigured ? 'rgba(251,191,36,0.4)' : 'rgba(239,68,68,0.4)'}`
      }} />
      {isUnconfigured
        ? 'API not configured. Set NEXT_PUBLIC_API_URL in your Vercel environment variables.'
        : 'API unreachable. The backend may be down.'}
    </div>
  )
}
