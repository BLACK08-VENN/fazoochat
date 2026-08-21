'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface Conversation {
  id: string
  status: string
  channel: string
  last_message_at: string
  created_at: string
  assistants?: { name: string }
  customers?: { name: string; email: string }
}

interface Message {
  id: string
  sender_type: string
  content: string
  created_at: string
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [escalateReason, setEscalateReason] = useState('')
  const [showEscalate, setShowEscalate] = useState(false)

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadConversations() {
    const token = await getToken()
    if (!token) return
    try {
      const url = statusFilter ? `/chat/conversations?status=${statusFilter}` : '/chat/conversations'
      const data = await apiAuthFetch(url, token)
      setConversations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadConversations() }, [statusFilter])

  useEffect(() => {
    if (!selectedId) return
    const interval = setInterval(() => {
      selectConversation(selectedId)
    }, 10000)
    return () => clearInterval(interval)
  }, [selectedId])

  async function selectConversation(id: string) {
    setSelectedId(id)
    setMessagesLoading(true)
    const token = await getToken()
    if (!token) return
    try {
      const data = await apiAuthFetch(`/chat/conversations/${id}/messages`, token)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load messages:', err)
      setMessages([])
    }
    setMessagesLoading(false)
  }

  async function closeConversation(id: string) {
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/chat/conversations/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify({ status: 'closed' })
    })
    loadConversations()
    if (selectedId === id) selectConversation(id)
  }

  async function escalateConversation(id: string) {
    if (!escalateReason.trim()) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/chat/conversations/${id}/escalate`, token, {
      method: 'POST',
      body: JSON.stringify({ reason: escalateReason })
    })
    setEscalateReason('')
    setShowEscalate(false)
    loadConversations()
    if (selectedId === id) selectConversation(id)
  }

  function formatTime(ts: string) {
    if (!ts) return ''
    return new Date(ts).toLocaleString()
  }

  function statusStyle(s: string) {
    const map: Record<string, { bg: string; text: string; glow: string }> = {
      open: { bg: 'rgba(34,197,94,0.1)', text: '#4ade80', glow: '0 0 8px rgba(34,197,94,0.2)' },
      closed: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.35)', glow: 'none' },
      escalated: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', glow: '0 0 8px rgba(239,68,68,0.2)' },
      resolved: { bg: 'rgba(96,165,250,0.1)', text: '#60a5fa', glow: '0 0 8px rgba(96,165,250,0.2)' }
    }
    return map[s] || map.open
  }

  const filters = ['', 'open', 'closed', 'escalated', 'resolved']

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Conversations</h1>
        <p className="text-white/30 text-sm tracking-wider uppercase">Message Threads</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-5">
        {filters.map(f => {
          const active = statusFilter === f
          return (
            <button
              key={f || 'all'}
              onClick={() => setStatusFilter(f)}
              className="text-[11px] px-4 py-2 rounded-lg transition-all duration-300 tracking-widest uppercase"
              style={active ? {
                background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(147,51,234,0.1))',
                color: '#fff',
                boxShadow: '0 0 16px rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.2)'
              } : {
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.3)',
                border: '1px solid rgba(255,255,255,0.04)'
              }}
            >
              {f || 'All'}
            </button>
          )
        })}
      </div>

      <div className="flex gap-5">
        {/* Conversation list */}
        <div className="w-1/3 glass-futuristic rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5 flex items-center gap-3 text-white/30">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/20 text-sm">No conversations yet.</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {conversations.map(c => {
                const active = selectedId === c.id
                const s = statusStyle(c.status)
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`w-full text-left p-4 transition-all duration-300 border-b border-white/[0.03] ${
                      active ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                    style={active ? { borderLeft: '2px solid #f97316' } : { borderLeft: '2px solid transparent' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-white/80 truncate">
                          {c.customers?.name || c.customers?.email || 'Anonymous'}
                        </p>
                        <p className="text-[11px] text-white/25 mt-0.5">
                          {c.assistants?.name || 'Unknown'} &middot; {c.channel || 'web'}
                        </p>
                      </div>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-md tracking-wider uppercase shrink-0 ml-2"
                        style={{ background: s.bg, color: s.text, boxShadow: s.glow }}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/15 mt-2">{formatTime(c.last_message_at)}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Message detail + actions */}
        <div className="flex-1 glass-futuristic rounded-2xl p-5">
          {!selectedId ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/15 text-sm tracking-wider uppercase">Select a conversation</p>
            </div>
          ) : messagesLoading ? (
            <div className="flex items-center gap-3 text-white/30">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading messages...</span>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex gap-2 mb-4 pb-4 border-b border-white/[0.05]">
                <button onClick={() => closeConversation(selectedId)} className="neon-btn text-[11px] px-4 py-2 rounded-lg tracking-wider uppercase">
                  Close
                </button>
                <button onClick={() => setShowEscalate(!showEscalate)} className="text-[11px] px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-300"
                  style={{
                    background: showEscalate ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.05)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    color: '#f87171'
                  }}>
                  Escalate
                </button>
              </div>
              {showEscalate && (
                <div className="flex gap-2 mb-4 animate-fade-in">
                  <input
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                    placeholder="Reason for escalation..."
                    className="flex-1 rounded-lg px-4 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                  <button onClick={() => escalateConversation(selectedId)} className="text-[11px] px-4 py-2 rounded-lg transition-all duration-300"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    Submit
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.length === 0 ? (
                <p className="text-white/15 text-center mt-8 text-sm">No messages.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto stagger-children">
                  {messages.map(m => {
                    const isAssistant = m.sender_type === 'assistant'
                    return (
                      <div key={m.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className="max-w-xs lg:max-w-md px-4 py-2.5 text-[13px] leading-relaxed"
                          style={isAssistant
                            ? {
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                                backdropFilter: 'blur(12px)',
                                color: '#e8e0f0',
                                borderRadius: '16px 16px 16px 4px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.1)'
                              }
                            : {
                                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                color: '#fff',
                                borderRadius: '16px 16px 4px 16px',
                                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.2)'
                              }
                          }
                        >
                          <p>{m.content}</p>
                          <p className="text-[10px] mt-1.5 opacity-35">{formatTime(m.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
