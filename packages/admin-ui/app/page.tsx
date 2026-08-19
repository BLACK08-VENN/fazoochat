'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { apiAuthFetch, isApiConfigured } from '../lib/api'

export default function Page() {
  const [stats, setStats] = useState({ assistants: 0, conversations: 0, knowledgeSources: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isApiConfigured()) {
        setLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const token = session.access_token

      try {
        const [assistants, conversations] = await Promise.all([
          apiAuthFetch('/assistants', token).catch(() => []),
          apiAuthFetch('/chat/conversations', token).catch(() => [])
        ])

        const assistantList = Array.isArray(assistants) ? assistants : []
        let knowledgeCount = 0
        for (const a of assistantList) {
          try {
            const sources = await apiAuthFetch(`/knowledge/sources?assistant_id=${a.id}`, token)
            if (Array.isArray(sources)) knowledgeCount += sources.length
          } catch {}
        }

        setStats({
          assistants: assistantList.length,
          conversations: Array.isArray(conversations) ? conversations.length : 0,
          knowledgeSources: knowledgeCount
        })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Assistants', value: stats.assistants, color: 'from-orange-500 to-orange-600' },
    { label: 'Conversations', value: stats.conversations, color: 'from-purple-500 to-purple-600' },
    { label: 'Knowledge Sources', value: stats.knowledgeSources, color: 'from-violet-500 to-purple-500' }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold gradient-text mb-6">Dashboard</h1>
      {loading ? (
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map(c => (
            <div key={c.label} className="glass rounded-2xl p-6 group hover:glass-strong transition-all duration-300">
              <p className="text-sm text-white/50">{c.label}</p>
              <p className="text-3xl font-bold mt-1 gradient-text">{c.value}</p>
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className={`h-full rounded-full bg-gradient-to-r ${c.color}`} style={{ width: `${Math.min(c.value * 20, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
