'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface WhatsAppConfig {
  id: string
  twilio_account_sid: string
  twilio_whatsapp_number: string
  enabled: boolean
}

interface Workspace {
  id: string
  name: string
}

export default function WhatsAppPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [orgId, setOrgId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadData() {
    const token = await getToken()
    if (!token) return
    try {
      const workspaceData = await apiAuthFetch('/orgs/mine', token)
      const availableWorkspaces: Workspace[] = Array.isArray(workspaceData) ? workspaceData : []
      setWorkspaces(availableWorkspaces)
      if (availableWorkspaces.length > 0 && !orgId) {
        setOrgId(availableWorkspaces[0].id)
        await loadConfig(availableWorkspaces[0].id, token)
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config:', err)
    }
    setLoading(false)
  }

  async function loadConfig(oid: string, token: string) {
    try {
      const data = await apiAuthFetch(`/whatsapp/config/${oid}`, token)
      setConfig(data)
    } catch {
      setConfig(null)
    }
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (orgId) {
      getToken().then(token => { if (token) loadConfig(orgId, token) })
    }
  }, [orgId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const token = await getToken()
    if (!token) return
    try {
      await apiAuthFetch(`/whatsapp/config/${orgId}`, token, {
        method: 'POST',
        body: JSON.stringify({
          twilio_account_sid: accountSid,
          twilio_auth_token: authToken,
          twilio_whatsapp_number: whatsappNumber
        })
      })
      setSuccess('WhatsApp configuration saved')
      setShowForm(false)
      loadConfig(orgId, token)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete() {
    if (!confirm('Remove WhatsApp configuration?')) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/whatsapp/config/${orgId}`, token, { method: 'DELETE' })
    setConfig(null)
    setSuccess('Configuration removed')
  }

  const webhookUrl = orgId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/whatsapp/webhook/${orgId}` : ''

  const inputCls = 'w-full rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none transition-all duration-300'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">WhatsApp</h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">Twilio Integration</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Loading...</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-futuristic rounded-2xl p-8 text-center">
          <p className="text-white/20 text-sm">No organizations found.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            {workspaces.map(workspace => (
              <button
                key={workspace.id}
                onClick={() => setOrgId(workspace.id)}
                className="text-[11px] px-4 py-2 rounded-lg transition-all duration-300 tracking-widest uppercase"
                style={orgId === workspace.id ? {
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(147,51,234,0.1))',
                  color: '#fff',
                  border: '1px solid rgba(249,115,22,0.2)'
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                {workspace.name}
              </button>
            ))}
          </div>

          {config ? (
            <div className="space-y-4">
              <div className="glass-futuristic rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-light text-white/70">Configuration</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowForm(!showForm)} className="neon-btn text-[11px] px-4 py-2 rounded-lg tracking-wider uppercase">
                      {showForm ? 'Cancel' : 'Update'}
                    </button>
                    <button onClick={handleDelete} className="text-[11px] px-4 py-2 rounded-lg tracking-wider uppercase transition-all duration-300"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-white/30 tracking-widest uppercase mb-1">Account SID</p>
                    <p className="text-sm text-white/60 font-mono">{config.twilio_account_sid}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/30 tracking-widest uppercase mb-1">WhatsApp Number</p>
                    <p className="text-sm text-white/60">{config.twilio_whatsapp_number}</p>
                  </div>
                </div>
              </div>

              <div className="glass-futuristic rounded-2xl p-5">
                <h2 className="text-lg font-light text-white/70 mb-3">Webhook URL</h2>
                <p className="text-[11px] text-white/30 tracking-wider mb-2">Configure this URL in your Twilio Console as the WhatsApp webhook:</p>
                <div className="rounded-xl px-4 py-3 font-mono text-xs text-white/50" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {webhookUrl}
                </div>
              </div>

              {showForm && (
                <form onSubmit={handleSave} className="glass-futuristic rounded-2xl p-6 space-y-4 animate-fade-in-up">
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Twilio Account SID</label>
                    <input value={accountSid} onChange={e => setAccountSid(e.target.value)} className={inputCls} style={inputStyle} placeholder="AC..." required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Twilio Auth Token</label>
                    <input value={authToken} onChange={e => setAuthToken(e.target.value)} type="password" className={inputCls} style={inputStyle} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">WhatsApp Number</label>
                    <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} className={inputCls} style={inputStyle} placeholder="whatsapp:+1234567890" required />
                  </div>
                  {error && <p className="text-red-400/80 text-xs">{error}</p>}
                  {success && <p className="text-green-400/80 text-xs">{success}</p>}
                  <button type="submit" className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase">
                    Save Configuration
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="glass-futuristic rounded-2xl p-8">
              <p className="text-white/20 text-sm mb-4">WhatsApp is not configured for this organization.</p>
              {showForm ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Twilio Account SID</label>
                    <input value={accountSid} onChange={e => setAccountSid(e.target.value)} className={inputCls} style={inputStyle} placeholder="AC..." required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Twilio Auth Token</label>
                    <input value={authToken} onChange={e => setAuthToken(e.target.value)} type="password" className={inputCls} style={inputStyle} required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">WhatsApp Number</label>
                    <input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} className={inputCls} style={inputStyle} placeholder="whatsapp:+1234567890" required />
                  </div>
                  {error && <p className="text-red-400/80 text-xs">{error}</p>}
                  <button type="submit" className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase">
                    Save Configuration
                  </button>
                </form>
              ) : (
                <button onClick={() => setShowForm(true)} className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase">
                  + Configure WhatsApp
                </button>
              )}
            </div>
          )}

          {success && !showForm && (
            <p className="text-green-400/80 text-xs mt-4">{success}</p>
          )}
        </>
      )}
    </div>
  )
}
