'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface KnowledgeSource {
  id: string
  title: string
  source_type: string
  status: string
  assistant_id: string
  created_at: string
}

export default function KnowledgePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [error, setError] = useState('')
  const [assistants, setAssistants] = useState<any[]>([])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadData() {
    const token = await getToken()
    if (!token) return
    try {
      const assistantList = await apiAuthFetch('/assistants', token)
      setAssistants(Array.isArray(assistantList) ? assistantList : [])
      const allSources: KnowledgeSource[] = []
      for (const a of (Array.isArray(assistantList) ? assistantList : [])) {
        try {
          const src = await apiAuthFetch(`/knowledge/sources?assistant_id=${a.id}`, token)
          if (Array.isArray(src)) allSources.push(...src)
        } catch (err) {
          console.error('Failed to load sources for assistant:', a.id, err)
        }
      }
      setSources(allSources)
    } catch (err) {
      console.error('Failed to load knowledge data:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const token = await getToken()
    if (!token) return
    try {
      await apiAuthFetch('/knowledge/sources', token, {
        method: 'POST',
        body: JSON.stringify({ assistant_id: assistantId, title, content, organization_id: orgId })
      })
      setShowCreate(false)
      setTitle('')
      setContent('')
      setAssistantId('')
      setOrgId('')
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this knowledge source?')) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/knowledge/sources/${id}`, token, { method: 'DELETE' })
    loadData()
  }

  function statusBadge(status: string) {
    const styles: Record<string, { bg: string; text: string; glow: string }> = {
      ready: { bg: 'rgba(34,197,94,0.1)', text: '#4ade80', glow: '0 0 8px rgba(34,197,94,0.15)' },
      processing: { bg: 'rgba(250,204,21,0.1)', text: '#facc15', glow: '0 0 8px rgba(250,204,21,0.15)' },
      pending: { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.3)', glow: 'none' },
      error: { bg: 'rgba(239,68,68,0.1)', text: '#f87171', glow: '0 0 8px rgba(239,68,68,0.15)' }
    }
    const s = styles[status] || styles.pending
    return (
      <span
        className="text-[10px] px-2.5 py-1 rounded-md tracking-wider uppercase"
        style={{ background: s.bg, color: s.text, boxShadow: s.glow }}
      >
        {status}
      </span>
    )
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none transition-all duration-300'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Knowledge Sources</h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">Data & Training</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase"
        >
          {showCreate ? 'Cancel' : '+ New Source'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-futuristic rounded-2xl p-6 mb-6 space-y-4 animate-fade-in-up relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none scan-line opacity-10" />
          <div className="relative">
            <div>
              <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} style={inputStyle} required />
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Content</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} className={inputCls} style={inputStyle} required />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Assistant</label>
                <select value={assistantId} onChange={e => setAssistantId(e.target.value)} className={inputCls} style={inputStyle} required>
                  <option value="">Select assistant</option>
                  {assistants.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Organization ID</label>
                <input value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls} style={inputStyle} required />
              </div>
            </div>
            {error && (
              <p className="text-red-400/80 text-xs px-3 py-2 rounded-lg mt-4" style={{
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.12)'
              }}>
                {error}
              </p>
            )}
            <button type="submit" className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase mt-4">
              Create &amp; Process
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Loading...</span>
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/15 text-sm tracking-wider uppercase">No knowledge sources yet.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {sources.map(s => (
            <div key={s.id} className="glass-futuristic rounded-2xl p-5 flex items-center justify-between card-hover relative overflow-hidden group">
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)' }} />
              <div className="relative z-10">
                <p className="font-medium text-white/80">{s.title}</p>
                <p className="text-[11px] text-white/25 mt-1">
                  Type: {s.source_type} &middot; Created: {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                {statusBadge(s.status)}
                <button onClick={() => handleDelete(s.id)} className="text-[11px] text-white/20 hover:text-red-400/70 transition-colors duration-300 tracking-wider uppercase">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
