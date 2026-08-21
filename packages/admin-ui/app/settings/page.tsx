'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface OrgMember {
  id: string
  user_id: string
  role: string
  created_at: string
}

interface Org {
  id: string
  name: string
  slug: string
}

export default function SettingsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [error, setError] = useState('')

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadData() {
    const token = await getToken()
    if (!token) return
    try {
      const profileData = await apiAuthFetch('/auth/verify', token)
      const orgList = (profileData.orgs || []).map((o: any) => ({
        id: o.organization_id,
        name: o.organization_id,
        role: o.role
      }))
      setOrgs(orgList)
      if (orgList.length > 0 && !selectedOrg) {
        setSelectedOrg(orgList[0].id)
      }
    } catch (err) {
      console.error('Failed to load orgs:', err)
    }
    setLoading(false)
  }

  async function loadMembers() {
    if (!selectedOrg) return
    const token = await getToken()
    if (!token) return
    try {
      const data = await apiAuthFetch(`/orgs/${selectedOrg}/members`, token)
      setMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load members:', err)
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadMembers() }, [selectedOrg])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const token = await getToken()
    if (!token) return
    try {
      await apiAuthFetch(`/orgs/${selectedOrg}/members`, token, {
        method: 'POST',
        body: JSON.stringify({ user_id: inviteUserId, role: inviteRole })
      })
      setInviteUserId('')
      setInviteRole('member')
      setShowInvite(false)
      loadMembers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this member?')) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/orgs/${selectedOrg}/members/${memberId}`, token, { method: 'DELETE' })
    loadMembers()
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none transition-all duration-300'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Settings</h1>
        <p className="text-white/30 text-sm tracking-wider uppercase">Organization Management</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm tracking-wide">Loading...</span>
        </div>
      ) : orgs.length === 0 ? (
        <div className="glass-futuristic rounded-2xl p-8 text-center">
          <p className="text-white/20 text-sm">No organizations found. Create one via the admin API.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            {orgs.map(o => (
              <button
                key={o.id}
                onClick={() => setSelectedOrg(o.id)}
                className="text-[11px] px-4 py-2 rounded-lg transition-all duration-300 tracking-widest uppercase"
                style={selectedOrg === o.id ? {
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(147,51,234,0.1))',
                  color: '#fff',
                  border: '1px solid rgba(249,115,22,0.2)'
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.3)',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                {o.name.slice(0, 12)}...
              </button>
            ))}
          </div>

          <div className="glass-futuristic rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-light text-white/70">Members</h2>
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="glow-btn text-white px-4 py-2 rounded-xl text-[11px] font-medium tracking-wider uppercase"
              >
                {showInvite ? 'Cancel' : '+ Add Member'}
              </button>
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="mb-4 p-4 rounded-xl animate-fade-in" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex gap-3">
                  <input
                    value={inviteUserId}
                    onChange={e => setInviteUserId(e.target.value)}
                    placeholder="User ID"
                    className={inputCls + ' flex-1'}
                    style={inputStyle}
                    required
                  />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={inputCls + ' w-32'} style={inputStyle}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="glow-btn text-white px-4 py-2 rounded-xl text-[11px] font-medium tracking-wider uppercase">
                    Add
                  </button>
                </div>
                {error && (
                  <p className="text-red-400/80 text-xs mt-2">{error}</p>
                )}
              </form>
            )}

            {members.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">No members.</p>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-white/[0.02] transition-colors border-b border-white/[0.03]">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
                        {m.user_id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white/70">{m.user_id.slice(0, 16)}...</p>
                        <p className="text-[11px] text-white/25">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md tracking-wider uppercase"
                        style={{
                          background: m.role === 'owner' ? 'rgba(249,115,22,0.1)' : m.role === 'admin' ? 'rgba(147,51,234,0.1)' : 'rgba(255,255,255,0.04)',
                          color: m.role === 'owner' ? '#f97316' : m.role === 'admin' ? '#a78bfa' : 'rgba(255,255,255,0.4)'
                        }}>
                        {m.role}
                      </span>
                      {m.role !== 'owner' && (
                        <button onClick={() => handleRemove(m.id)} className="text-[11px] text-white/20 hover:text-red-400/70 transition-colors duration-300 tracking-wider uppercase">
                          Remove
                        </button>
                      )}
                    </div>
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
