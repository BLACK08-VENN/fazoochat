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
    } catch {}
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

  const inputCls = 'w-full rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-400/50'
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold gradient-text">Assistants</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="glow-btn text-white px-4 py-2 rounded-lg text-sm font-medium">
          {showCreate ? 'Cancel' : '+ New Assistant'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-1">Organization ID</label>
            <input value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls} style={inputStyle} required />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="glow-btn text-white px-4 py-2 rounded-lg text-sm font-medium">Create</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : assistants.length === 0 ? (
        <p className="text-white/40">No assistants yet.</p>
      ) : (
        <div className="space-y-3">
          {assistants.map(a => (
            <div key={a.id} className="glass rounded-2xl p-4 flex items-center justify-between hover:glass-strong transition-all duration-200">
              <div>
                <p className="font-medium text-white">{a.name}</p>
                <p className="text-sm text-white/40">{a.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${a.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                  {a.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button onClick={() => handleDelete(a.id)} className="text-red-400 text-sm hover:text-red-300 transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
