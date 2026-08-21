'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { apiAuthFetch } from '../../lib/api'

interface Assistant {
  id: string
  name: string
  description: string | null
  enabled: boolean
  created_at: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export default function AssistantsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const [creatingAssistant, setCreatingAssistant] = useState(false)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [orgId, setOrgId] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const [assistantData, workspaceData] = await Promise.all([
        apiAuthFetch('/assistants', token),
        apiAuthFetch('/orgs/mine', token)
      ])
      const assistantList = Array.isArray(assistantData) ? assistantData : []
      const workspaceList = Array.isArray(workspaceData) ? workspaceData : []
      setAssistants(assistantList)
      setWorkspaces(workspaceList)
      setOrgId(current => {
        if (current && workspaceList.some(workspace => workspace.id === current)) return current
        return workspaceList[0]?.id || ''
      })
    } catch (loadError) {
      setError(errorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const token = await getAccessToken()
    if (!token) return

    setCreatingWorkspace(true)
    try {
      const workspace = await apiAuthFetch('/orgs/mine', token, {
        method: 'POST',
        body: JSON.stringify({ name: workspaceName, slug: workspaceSlug })
      }) as Workspace
      setWorkspaces(current => [...current, workspace])
      setOrgId(workspace.id)
      setWorkspaceName('')
      setWorkspaceSlug('')
      setShowWorkspace(false)
      setShowCreate(true)
    } catch (createError) {
      setError(errorMessage(createError))
    } finally {
      setCreatingWorkspace(false)
    }
  }

  async function handleCreateAssistant(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const token = await getAccessToken()
    if (!token || !orgId) return

    setCreatingAssistant(true)
    try {
      const assistant = await apiAuthFetch('/assistants', token, {
        method: 'POST',
        body: JSON.stringify({
          organization_id: orgId,
          name,
          description: description || undefined,
          system_prompt: systemPrompt || undefined,
          welcome_message: welcomeMessage || undefined
        })
      }) as Assistant
      setAssistants(current => [...current, assistant])
      setShowCreate(false)
      setName('')
      setDescription('')
      setSystemPrompt('')
      setWelcomeMessage('')
    } catch (createError) {
      setError(errorMessage(createError))
    } finally {
      setCreatingAssistant(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this assistant?')) return
    const token = await getAccessToken()
    if (!token) return

    try {
      await apiAuthFetch(`/assistants/${id}`, token, { method: 'DELETE' })
      setAssistants(current => current.filter(assistant => assistant.id !== id))
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    }
  }

  const inputClass = 'w-full rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 transition-all duration-300 focus:outline-none'
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-light tracking-wide shimmer-text">Assistants</h1>
          <p className="text-sm uppercase tracking-wider text-white/30">AI Agents</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowWorkspace(current => !current)
              setShowCreate(false)
              setError('')
            }}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white/60 transition hover:border-orange-400/20 hover:text-white"
          >
            {showWorkspace ? 'Cancel' : '+ Workspace'}
          </button>
          <button
            type="button"
            disabled={workspaces.length === 0}
            onClick={() => {
              setShowCreate(current => !current)
              setShowWorkspace(false)
              setError('')
            }}
            className="glow-btn rounded-xl px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {showCreate ? 'Cancel' : '+ New Assistant'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mb-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-xs text-red-300/80" role="alert">
          {error}
        </p>
      ) : null}

      {showWorkspace ? (
        <form onSubmit={handleCreateWorkspace} className="glass-futuristic relative mb-6 space-y-4 overflow-hidden rounded-2xl p-6">
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-10 scan-line" />
          <div className="relative">
            <h2 className="text-lg font-light text-white/75">Create your workspace</h2>
            <p className="mt-1 text-xs text-white/30">Assistants, customers and conversations live inside a workspace.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Workspace name</span>
                <input
                  value={workspaceName}
                  onChange={event => {
                    setWorkspaceName(event.target.value)
                    setWorkspaceSlug(slugify(event.target.value))
                  }}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Acme Support"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Workspace slug</span>
                <input
                  value={workspaceSlug}
                  onChange={event => setWorkspaceSlug(slugify(event.target.value))}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="acme-support"
                  pattern="[a-z0-9-]+"
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={creatingWorkspace || !workspaceSlug}
              className="glow-btn mt-5 rounded-xl px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white disabled:opacity-40"
            >
              {creatingWorkspace ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form onSubmit={handleCreateAssistant} className="glass-futuristic relative mb-6 space-y-4 overflow-hidden rounded-2xl p-6">
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-10 scan-line" />
          <div className="relative grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Workspace</span>
              <select value={orgId} onChange={event => setOrgId(event.target.value)} className={inputClass} style={inputStyle} required>
                {workspaces.map(workspace => (
                  <option key={workspace.id} value={workspace.id} className="bg-[#15121f]">{workspace.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Assistant name</span>
              <input value={name} onChange={event => setName(event.target.value)} className={inputClass} style={inputStyle} placeholder="Fazoo Support" required />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Description</span>
              <input value={description} onChange={event => setDescription(event.target.value)} className={inputClass} style={inputStyle} placeholder="Answers product and support questions" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">System instructions</span>
              <textarea value={systemPrompt} onChange={event => setSystemPrompt(event.target.value)} className={`${inputClass} min-h-28 resize-y`} style={inputStyle} placeholder="You are a helpful customer support assistant…" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-widest text-white/35">Welcome message</span>
              <input value={welcomeMessage} onChange={event => setWelcomeMessage(event.target.value)} className={inputClass} style={inputStyle} placeholder="Hi! How can I help today?" />
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={creatingAssistant} className="glow-btn rounded-xl px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white disabled:opacity-40">
                {creatingAssistant ? 'Creating…' : 'Create assistant'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-white/30">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
          <span className="text-sm tracking-wide">Loading...</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-futuristic rounded-2xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-white/55">Create your first workspace</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/25">A workspace connects your assistants, team members, customers and conversations.</p>
          <button type="button" onClick={() => setShowWorkspace(true)} className="glow-btn mt-6 rounded-xl px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white">
            Create workspace
          </button>
        </div>
      ) : assistants.length === 0 ? (
        <div className="glass-futuristic rounded-2xl px-6 py-16 text-center">
          <p className="text-sm font-medium text-white/55">No assistants yet</p>
          <p className="mt-2 text-sm text-white/25">Create an assistant for {workspaces.find(workspace => workspace.id === orgId)?.name || 'your workspace'}.</p>
          <button type="button" onClick={() => setShowCreate(true)} className="glow-btn mt-6 rounded-xl px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white">
            Create assistant
          </button>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {assistants.map(assistant => (
            <div key={assistant.id} className="glass-futuristic group relative flex items-center justify-between overflow-hidden rounded-2xl p-5 card-hover">
              <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)' }} />
              <div className="relative z-10">
                <p className="font-medium text-white/80">{assistant.name}</p>
                <p className="mt-1 text-[11px] text-white/25">{assistant.description || 'No description'}</p>
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <span className={`rounded-md px-2.5 py-1 text-[10px] uppercase tracking-wider ${assistant.enabled ? 'bg-green-400/10 text-green-300' : 'bg-white/[0.04] text-white/30'}`}>
                  {assistant.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <button type="button" onClick={() => void handleDelete(assistant.id)} className="text-[11px] uppercase tracking-wider text-white/20 transition-colors hover:text-red-400/70">
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
