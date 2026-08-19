'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '../../lib/api'

interface Assistant {
  id: string
  name: string
  welcome_message: string
  avatar_url: string | null
  primary_color: string | null
}

interface Message {
  id: string
  sender_type: string
  content: string
  created_at: string
}

export default function WidgetContent() {
  const searchParams = useSearchParams()
  const assistantId = searchParams.get('assistantId') || ''

  const [assistant, setAssistant] = useState<Assistant | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!assistantId) return
    apiFetch(`/chat/public/assistants/${assistantId}`)
      .then((data: Assistant) => {
        setAssistant(data)
        if (data.welcome_message) {
          setMessages([{
            id: 'welcome',
            sender_type: 'assistant',
            content: data.welcome_message,
            created_at: new Date().toISOString()
          }])
        }
      })
      .catch(() => setError('Unable to load chat'))
  }, [assistantId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_type: 'customer',
      content: text,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])
    setSending(true)
    setError('')

    try {
      const res = await apiFetch('/chat/public', {
        method: 'POST',
        body: JSON.stringify({
          assistant_id: assistantId,
          message: text,
          conversation_id: conversationId
        })
      })
      setConversationId(res.conversation_id)
      const botMsg: Message = {
        id: `reply-${Date.now()}`,
        sender_type: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev.slice(0, -1), userMsg, botMsg])
    } catch {
      setError('Failed to send message. Please try again.')
      setMessages(prev => prev.slice(0, -1))
    }
    setSending(false)
  }

  if (!assistantId) {
    return (
      <div className="h-full flex items-center justify-center text-white/60 text-sm" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
        No assistant configured.
      </div>
    )
  }

  if (error && !assistant) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-sm" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
        {error}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 backdrop-blur-xl border-b border-white/10">
        {assistant?.avatar_url ? (
          <img src={assistant.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-orange-400/50" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-orange-400/50" style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)' }}>
            {(assistant?.name || 'A')[0]}
          </div>
        )}
        <span className="font-semibold text-sm text-white">{assistant?.name || 'Chat'}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed"
              style={msg.sender_type === 'customer'
                ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', borderBottomRightRadius: '4px' }
                : { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', color: '#fff', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl text-sm" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderBottomLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="animate-pulse text-white/60">...</span>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-3 py-3 backdrop-blur-xl border-t border-white/10">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 text-sm px-4 py-2 rounded-full text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400/50 disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)' }}
        >
          &#8593;
        </button>
      </form>
    </div>
  )
}
