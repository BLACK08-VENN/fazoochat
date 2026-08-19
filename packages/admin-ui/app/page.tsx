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
    { label: 'Assistants', value: stats.assistants, icon: '🤖', gradient: 'from-orange-500/20 to-orange-600/10', barColor: '#f97316' },
    { label: 'Conversations', value: stats.conversations, icon: '💬', gradient: 'from-purple-500/20 to-purple-600/10', barColor: '#9333ea' },
    { label: 'Knowledge Sources', value: stats.knowledgeSources, icon: '📚', gradient: 'from-violet-500/20 to-purple-500/10', barColor: '#8b5cf6' }
  ]

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Dashboard</h1>
        <p className="text-white/30 text-sm tracking-wider uppercase">System Overview</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Initializing...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
          {cards.map(c => (
            <div
              key={c.label}
              className="glass-futuristic rounded-2xl p-6 card-hover relative overflow-hidden group"
            >
              {/* Ambient glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${c.barColor}15, transparent 70%)` }} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-white/40 tracking-widest uppercase font-light">{c.label}</p>
                  <span className="text-lg opacity-50">{c.icon}</span>
                </div>
                <p className="text-4xl font-light text-white/90 mb-4">{c.value}</p>
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.min(c.value * 20, 100)}%`,
                      background: `linear-gradient(90deg, ${c.barColor}, ${c.barColor}88)`,
                      boxShadow: `0 0 12px ${c.barColor}44`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
