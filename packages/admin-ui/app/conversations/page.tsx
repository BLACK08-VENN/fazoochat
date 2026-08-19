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
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadConversations() }, [statusFilter])

  async function selectConversation(id: string) {
    setSelectedId(id)
    setMessagesLoading(true)
    const token = await getToken()
    if (!token) return
    try {
      const data = await apiAuthFetch(`/chat/conversations/${id}/messages`, token)
      setMessages(Array.isArray(data) ? data : [])
    } catch {
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

  function statusColor(s: string) {
    const map: Record<string, string> = {
      open: 'bg-green-500/20 text-green-400',
      closed: 'bg-white/10 text-white/40',
      escalated: 'bg-red-500/20 text-red-400',
      resolved: 'bg-blue-500/20 text-blue-400'
    }
    return map[s] || map.open
  }

  const filters = ['', 'open', 'closed', 'escalated', 'resolved']

  return (
    <div>
      <h1 className="text-2xl font-bold gradient-text mb-6">Conversations</h1>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f || 'all'}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              statusFilter === f ? 'text-white font-medium' : 'text-white/40 hover:text-white/60'
            }`}
            style={statusFilter === f ? { background: 'rgba(249,115,22,0.3)' } : { background: 'rgba(255,255,255,0.05)' }}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Conversation list */}
        <div className="w-1/3 glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 flex items-center gap-3 text-white/40">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-white/40">No conversations yet.</p>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
              {conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-left p-4 transition-colors ${selectedId === c.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-white">
                        {c.customers?.name || c.customers?.email || 'Anonymous'}
                      </p>
                      <p className="text-xs text-white/40">
                        {c.assistants?.name || 'Unknown'} &middot; {c.channel || 'web'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mt-1">{formatTime(c.last_message_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message detail + actions */}
        <div className="flex-1 glass rounded-2xl p-4">
          {!selectedId ? (
            <p className="text-white/30 text-center mt-8">Select a conversation</p>
          ) : messagesLoading ? (
            <div className="flex items-center gap-3 text-white/40">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Loading messages...
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="flex gap-2 mb-4 pb-3 border-b border-white/10">
                <button onClick={() => closeConversation(selectedId)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  Close
                </button>
                <button onClick={() => setShowEscalate(!showEscalate)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                  Escalate
                </button>
              </div>
              {showEscalate && (
                <div className="flex gap-2 mb-4">
                  <input
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                    placeholder="Reason for escalation..."
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-400/50"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button onClick={() => escalateConversation(selectedId)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                    Submit
                  </button>
                </div>
              )}

              {/* Messages */}
              {messages.length === 0 ? (
                <p className="text-white/30">No messages.</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_type === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                        m.sender_type === 'assistant'
                          ? 'text-white'
                          : 'text-white'
                      }`}
                      style={m.sender_type === 'assistant'
                        ? { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }
                        : { background: 'linear-gradient(135deg, #f97316, #ea580c)', borderBottomRightRadius: '4px' }
                      }>
                        <p>{m.content}</p>
                        <p className="text-xs mt-1 opacity-50">{formatTime(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
