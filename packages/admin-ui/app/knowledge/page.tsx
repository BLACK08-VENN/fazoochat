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
        } catch {}
      }
      setSources(allSources)
    } catch {}
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
    const colors: Record<string, string> = {
      ready: 'bg-green-500/20 text-green-400',
      processing: 'bg-yellow-500/20 text-yellow-400',
      pending: 'bg-white/10 text-white/40',
      error: 'bg-red-500/20 text-red-400'
    }
    return <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || colors.pending}`}>{status}</span>
  }

  const inputCls = 'w-full rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-400/50'
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold gradient-text">Knowledge Sources</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="glow-btn text-white px-4 py-2 rounded-lg text-sm font-medium">
          {showCreate ? 'Cancel' : '+ New Source'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={6} className={inputCls} style={inputStyle} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Assistant</label>
              <select value={assistantId} onChange={e => setAssistantId(e.target.value)} className={inputCls} style={inputStyle} required>
                <option value="">Select assistant</option>
                {assistants.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1">Organization ID</label>
              <input value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls} style={inputStyle} required />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="glow-btn text-white px-4 py-2 rounded-lg text-sm font-medium">Create &amp; Process</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : sources.length === 0 ? (
        <p className="text-white/40">No knowledge sources yet.</p>
      ) : (
        <div className="space-y-3">
          {sources.map(s => (
            <div key={s.id} className="glass rounded-2xl p-4 flex items-center justify-between hover:glass-strong transition-all duration-200">
              <div>
                <p className="font-medium text-white">{s.title}</p>
                <p className="text-sm text-white/40">Type: {s.source_type} &middot; Created: {new Date(s.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(s.status)}
                <button onClick={() => handleDelete(s.id)} className="text-red-400 text-sm hover:text-red-300 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
