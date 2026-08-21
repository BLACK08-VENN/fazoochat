'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  organization_id: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [orgId, setOrgId] = useState('')
  const [error, setError] = useState('')
  const [orgIds, setOrgIds] = useState<string[]>([])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function loadData() {
    const token = await getToken()
    if (!token) return
    try {
      const profileData = await apiAuthFetch('/auth/verify', token)
      const ids = (profileData.orgs || []).map((o: any) => o.organization_id)
      setOrgIds(ids)
      if (ids.length > 0 && !orgId) setOrgId(ids[0])

      if (ids.length > 0) {
        const allCustomers: Customer[] = []
        for (const oid of ids) {
          try {
            const data = await apiAuthFetch(`/customers?organization_id=${oid}`, token)
            if (Array.isArray(data)) allCustomers.push(...data)
          } catch (err) {
            console.error('Failed to load customers for org:', oid, err)
          }
        }
        setCustomers(allCustomers)
      }
    } catch (err) {
      console.error('Failed to load customers:', err)
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
      await apiAuthFetch('/customers', token, {
        method: 'POST',
        body: JSON.stringify({ organization_id: orgId, name, email, phone })
      })
      setShowCreate(false)
      setName('')
      setEmail('')
      setPhone('')
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    const token = await getToken()
    if (!token) return
    await apiAuthFetch(`/customers/${id}`, token, { method: 'DELETE' })
    loadData()
  }

  const inputCls = 'w-full rounded-xl px-4 py-3 text-white/80 placeholder-white/20 text-sm focus:outline-none transition-all duration-300'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-wide shimmer-text mb-2">Customers</h1>
          <p className="text-white/30 text-sm tracking-wider uppercase">Customer Management</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="glow-btn text-white px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wider uppercase"
        >
          {showCreate ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="glass-futuristic rounded-2xl p-6 mb-6 space-y-4 animate-fade-in-up relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none scan-line opacity-10" />
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/35 mb-2 tracking-widest uppercase">Organization</label>
                <select value={orgId} onChange={e => setOrgId(e.target.value)} className={inputCls} style={inputStyle} required>
                  {orgIds.map(id => <option key={id} value={id}>{id.slice(0, 8)}...</option>)}
                </select>
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
      ) : customers.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/15 text-sm tracking-wider uppercase">No customers yet.</p>
        </div>
      ) : (
        <div className="glass-futuristic rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.05]">
                <th className="text-left text-[11px] text-white/30 tracking-widest uppercase px-5 py-3 font-medium">Name</th>
                <th className="text-left text-[11px] text-white/30 tracking-widest uppercase px-5 py-3 font-medium">Email</th>
                <th className="text-left text-[11px] text-white/30 tracking-widest uppercase px-5 py-3 font-medium">Phone</th>
                <th className="text-left text-[11px] text-white/30 tracking-widest uppercase px-5 py-3 font-medium">Created</th>
                <th className="text-right text-[11px] text-white/30 tracking-widest uppercase px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm text-white/70">{c.name || '-'}</td>
                  <td className="px-5 py-3 text-sm text-white/50">{c.email || '-'}</td>
                  <td className="px-5 py-3 text-sm text-white/50">{c.phone || '-'}</td>
                  <td className="px-5 py-3 text-[11px] text-white/25">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-[11px] text-white/20 hover:text-red-400/70 transition-colors duration-300 tracking-wider uppercase">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
