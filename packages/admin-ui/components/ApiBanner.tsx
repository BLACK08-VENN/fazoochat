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

  return (
    <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium" style={{
      background: status === 'unconfigured'
        ? 'rgba(251,191,36,0.1)'
        : 'rgba(239,68,68,0.1)',
      border: status === 'unconfigured'
        ? '1px solid rgba(251,191,36,0.2)'
        : '1px solid rgba(239,68,68,0.2)',
      color: status === 'unconfigured'
        ? 'rgb(251,191,36)'
        : 'rgb(239,68,68)'
    }}>
      {status === 'unconfigured'
        ? 'API not configured. Set NEXT_PUBLIC_API_URL in your Vercel environment variables.'
        : 'API unreachable. The backend may be down.'}
    </div>
  )
}
