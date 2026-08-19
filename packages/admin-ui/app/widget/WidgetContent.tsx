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

function TypingIndicator() {
  return (
    <div className="flex justify-start msg-appear-left">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-sm" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

function formatTime(ts: string) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    inputRef.current?.focus()
  }, [assistant])

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
      <div className="h-full flex items-center justify-center text-white/40 text-sm relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(147,51,234,0.08) 0%, transparent 60%), linear-gradient(135deg, #0a0a12 0%, #0f0a1a 50%, #0a0a12 100%)'
        }} />
        <span className="relative z-10">No assistant configured.</span>
      </div>
    )
  }

  if (error && !assistant) {
    return (
      <div className="h-full flex items-center justify-center text-red-400/80 text-sm relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(239,68,68,0.06) 0%, transparent 60%), linear-gradient(135deg, #0a0a12 0%, #0f0a1a 50%, #0a0a12 100%)'
        }} />
        <span className="relative z-10">{error}</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0a0a12 0%, #0f0a1a 30%, #0d0815 60%, #0a0a12 100%)'
    }}>
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${15 + i * 15}%`,
              bottom: '-10px',
              animationDuration: `${8 + i * 3}s`,
              animationDelay: `${i * 1.5}s`,
              opacity: 0.3 + (i % 3) * 0.1
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)'
      }}>
        {/* Avatar */}
        <div className="relative">
          {assistant?.avatar_url ? (
            <div className="avatar-ring rounded-full">
              <img src={assistant.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover relative z-[1]" />
            </div>
          ) : (
            <div className="avatar-ring rounded-full">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold relative z-[1]" style={{
                background: 'linear-gradient(135deg, #f97316, #9333ea)'
              }}>
                {(assistant?.name || 'A')[0]}
              </div>
            </div>
          )}
          {/* Online dot */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0a0a12] z-10">
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-white/90 block truncate">{assistant?.name || 'Chat'}</span>
          <span className="text-[10px] text-green-400/70 tracking-wide uppercase">Online</span>
        </div>

        {/* Subtle scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none scan-line opacity-30" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative">
        {messages.map((msg, i) => {
          const isCustomer = msg.sender_type === 'customer'
          const showTime = i === messages.length - 1 || messages[i + 1]?.sender_type !== msg.sender_type
          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} ${isCustomer ? 'msg-appear-right' : 'msg-appear-left'}`}
            >
              <div className="max-w-[82%] group">
                <div
                  className="px-4 py-2.5 text-[13px] leading-relaxed"
                  style={isCustomer
                    ? {
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#fff',
                        borderRadius: '18px 18px 4px 18px',
                        boxShadow: '0 4px 16px rgba(249, 115, 22, 0.25), 0 1px 4px rgba(0,0,0,0.2)'
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        color: '#e8e0f0',
                        borderRadius: '18px 18px 18px 4px',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 12px rgba(0,0,0,0.15)'
                      }
                  }
                >
                  {msg.content}
                </div>
                {showTime && (
                  <div className={`text-[10px] text-white/25 mt-1 px-1 ${isCustomer ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.created_at)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {sending && <TypingIndicator />}
        {error && (
          <div className="flex justify-center">
            <p className="text-[11px] text-red-400/70 px-3 py-1 rounded-full" style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)'
            }}>
              {error}
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="relative px-3 py-3 border-t border-white/[0.06]" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)'
      }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="w-full text-[13px] px-4 py-2.5 rounded-xl text-white/90 placeholder-white/25 focus:outline-none disabled:opacity-40 transition-all duration-300"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 disabled:opacity-30 disabled:scale-95 relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #f97316, #9333ea)',
              boxShadow: input.trim() ? '0 0 20px rgba(249, 115, 22, 0.3), 0 4px 12px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            <svg className="w-4 h-4 relative z-10 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <div className="absolute inset-0 bg-white/10 scale-0 group-active:scale-100 transition-transform duration-150 rounded-xl" />
          </button>
        </div>
      </form>
    </div>
  )
}
