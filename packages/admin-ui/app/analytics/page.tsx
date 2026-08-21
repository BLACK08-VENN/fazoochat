'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface AnalyticsSummary {
  total_conversations: number
  open_conversations: number
  total_messages: number
  customer_messages: number
  assistant_messages: number
  total_escalations: number
  open_escalations: number
  conversations_24h: number
  conversations_7d: number
  messages_24h: number
  messages_7d: number
}

interface AnalyticsEvent {
  id: string
  event_type: string
  assistant_id: string
  conversation_id: string
  metadata: any
  created_at: string
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [loading, setLoading] = useState(true)

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadData() {
    const token = await getToken()
    if (!token) return
    try {
      const [summaryData, eventsData] = await Promise.all([
        apiAuthFetch('/analytics/summary', token),
        apiAuthFetch('/analytics/events?limit=20', token)
      ])
      setSummary(summaryData)
      setEvents(Array.isArray(eventsData) ? eventsData : [])
    } catch (err) {
      console.error('Failed to load analytics:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function formatTime(ts: string) {
    if (!ts) return ''
    return new Date(ts).toLocaleString()
  }

  const statCards = summary ? [
    { label: 'Total Conversations', value: summary.total_conversations, color: '#f97316' },
    { label: 'Open Conversations', value: summary.open_conversations, color: '#22c55e' },
    { label: 'Total Messages', value: summary.total_messages, color: '#9333ea' },
    { label: 'Customer Messages', value: summary.customer_messages, color: '#3b82f6' },
    { label: 'Conversations (24h)', value: summary.conversations_24h, color: '#f97316' },
    { label: 'Conversations (7d)', value: summary.conversations_7d, color: '#eab308' },
    { label: 'Messages (24h)', value: summary.messages_24h, color: '#8b5cf6' },
    { label: 'Open Escalations', value: summary.open_escalations, color: '#ef4444' }
  ] : []

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Analytics</h1>
        <p className="text-white/30 text-sm tracking-wider uppercase">Performance Metrics</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Loading analytics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger-children">
            {statCards.map(c => (
              <div key={c.label} className="glass-futuristic rounded-2xl p-5 relative overflow-hidden group card-hover">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${c.color}15, transparent 70%)` }} />
                <div className="relative z-10">
                  <p className="text-[11px] text-white/40 tracking-widest uppercase font-light mb-2">{c.label}</p>
                  <p className="text-3xl font-light text-white/90">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-futuristic rounded-2xl p-5">
            <h2 className="text-lg font-light text-white/70 mb-4">Recent Events</h2>
            {events.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">No events recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md tracking-wider uppercase"
                        style={{
                          background: e.event_type === 'message_sent' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                          color: e.event_type === 'message_sent' ? '#4ade80' : 'rgba(255,255,255,0.4)'
                        }}>
                        {e.event_type}
                      </span>
                      <span className="text-xs text-white/30">
                        {e.metadata?.chunks_used ? `${e.metadata.chunks_used} chunks` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] text-white/20">{formatTime(e.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
