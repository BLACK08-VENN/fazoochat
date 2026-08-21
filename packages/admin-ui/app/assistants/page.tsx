'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface Assistant {
  id: string
  name: string
  description: string
  enabled: boolean
  created_at: string
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [orgId, setOrgId] = useState('')
  const [error, setError] = useState('')

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadAssistants() {
    const token = await getToken()
    if (!token) return
    try {
      const data = await apiAuthFetch('/assistants', token)
      setAssistants(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load assistants:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadAssistants() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const token = await getToken()
    if (!token) return
    try {
      await apiAuthFetch('/assistants', token, {
        method: 'POST',
        body: JSON.stringify({ organization_id: orgId, name, description })
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      setOrgId('')
      loadAssistants()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this assistant?')) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/assistants/${id}`, token, { method: 'DELETE' })
    loadAssistants()
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none transition-all duration-300'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Assistants</h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">AI Agents</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase"
        >
          {showCreate ? 'Cancel' : '+ New Assistant'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-futuristic rounded-2xl p-6 mb-6 space-y-4 animate-fade-in-up relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none scan-line opacity-10" />
          <div className="relative">
            <div>
              <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} required />
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} style={inputStyle} />
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Organization ID</label>
              <input value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls} style={inputStyle} required />
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
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Loading...</span>
        </div>
      ) : assistants.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/15 text-sm tracking-wider uppercase">No assistants yet.</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {assistants.map(a => {
            const enabledStyle = a.enabled
              ? { bg: 'rgba(34,197,94,0.1)', text: '#4ade80', glow: '0 0 8px rgba(34,197,94,0.15)' }
              : { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.3)', glow: 'none' }
            return (
              <div key={a.id} className="glass-futuristic rounded-2xl p-5 flex items-center justify-between card-hover relative overflow-hidden group">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)' }} />
                <div className="relative z-10">
                  <p className="font-medium text-white/80">{a.name}</p>
                  <p className="text-[11px] text-white/25 mt-1">{a.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-md tracking-wider uppercase"
                    style={{ background: enabledStyle.bg, color: enabledStyle.text, boxShadow: enabledStyle.glow }}
                  >
                    {a.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button onClick={() => handleDelete(a.id)} className="text-[11px] text-white/20 hover:text-red-400/70 transition-colors duration-300 tracking-wider uppercase">
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
