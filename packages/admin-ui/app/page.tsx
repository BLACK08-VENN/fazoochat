'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { apiAuthFetch, isApiConfigured } from '../lib/api'

type Stats = { assistants: number; conversations: number; knowledgeSources: number }

export default function Page() {
  const [stats, setStats] = useState<Stats>({ assistants: 0, conversations: 0, knowledgeSources: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isApiConfigured()) return setLoading(false)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return setLoading(false)
      const token = session.access_token

      try {
        const [assistants, conversations] = await Promise.all([
          apiAuthFetch('/assistants', token).catch(() => []),
          apiAuthFetch('/chat/conversations', token).catch(() => [])
        ])
        const assistantList = Array.isArray(assistants) ? assistants : []
        const sourceGroups = await Promise.all(assistantList.map(assistant =>
          apiAuthFetch(`/knowledge/sources?assistant_id=${assistant.id}`, token).catch(() => [])
        ))
        setStats({
          assistants: assistantList.length,
          conversations: Array.isArray(conversations) ? conversations.length : 0,
          knowledgeSources: sourceGroups.reduce((total, sources) => total + (Array.isArray(sources) ? sources.length : 0), 0)
        })
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const setup = [
    { label: 'Create an AI assistant', done: stats.assistants > 0, href: '/assistants' },
    { label: 'Add business knowledge', done: stats.knowledgeSources > 0, href: '/knowledge' },
    { label: 'Connect WhatsApp', done: false, href: '/whatsapp' }
  ]
  const completed = setup.filter(item => item.done).length
  const progress = Math.round((completed / setup.length) * 100)

  const metrics = [
    { label: 'AI assistants', value: stats.assistants, detail: 'Ready to serve customers', color: '#f97316' },
    { label: 'Conversations', value: stats.conversations, detail: 'Across every channel', color: '#a78bfa' },
    { label: 'Knowledge sources', value: stats.knowledgeSources, detail: 'Grounding your answers', color: '#34d399' }
  ]

  return (
    <div className="animate-fade-in space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">Workspace overview</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">Good to see you.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/42">Build assistants customers trust, then run every conversation from one place.</p>
        </div>
        <Link href="/assistants" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(249,115,22,.2)] transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50">
          <span className="text-lg font-light">+</span> New assistant
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Workspace metrics">
        {metrics.map(metric => (
          <article key={metric.label} className="product-card relative overflow-hidden rounded-2xl p-5">
            <span className="absolute inset-x-0 top-0 h-px opacity-60" style={{ background: `linear-gradient(90deg, transparent, ${metric.color}, transparent)` }} />
            <div className="flex items-start justify-between">
              <div><p className="eyebrow">{metric.label}</p><p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white">{loading ? '—' : metric.value}</p></div>
              <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: metric.color, boxShadow: `0 0 14px ${metric.color}80` }} />
            </div>
            <p className="mt-3 text-xs text-white/30">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="product-card rounded-2xl p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow">Launch guide</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">Put your assistant to work</h2></div>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1 text-xs font-medium text-white/45">{completed} of {setup.length}</span>
          </div>
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.045]"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
          <div className="mt-5 divide-y divide-white/[0.055]">
            {setup.map((item, index) => (
              <Link key={item.label} href={item.href} className="group flex items-center gap-4 py-4 first:pt-2 last:pb-1">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold ${item.done ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-white/[0.09] bg-white/[0.025] text-white/35'}`}>{item.done ? '✓' : index + 1}</span>
                <span className="flex-1 text-sm font-medium text-white/70 group-hover:text-white">{item.label}</span>
                <span className="text-white/20 transition group-hover:translate-x-1 group-hover:text-orange-300">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="product-card flex flex-col rounded-2xl p-6 sm:p-7">
          <p className="eyebrow">Channels</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">Meet customers anywhere</h2>
          <div className="mt-6 space-y-3">
            <Link href="/whatsapp" className="flex items-center gap-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.045] p-3.5 transition hover:bg-emerald-400/[0.075]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-400/10 text-lg text-emerald-300">☎</span><span className="flex-1"><span className="block text-sm font-medium text-white/75">WhatsApp</span><span className="text-xs text-white/30">Connect with Twilio</span></span><span className="text-white/20">→</span></Link>
            <Link href="/assistants" className="flex items-center gap-3 rounded-xl border border-white/[0.065] bg-white/[0.025] p-3.5 transition hover:bg-white/[0.045]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-400/10 text-lg text-orange-300">◇</span><span className="flex-1"><span className="block text-sm font-medium text-white/75">Web widget</span><span className="text-xs text-white/30">Embed on your website</span></span><span className="text-white/20">→</span></Link>
          </div>
          <p className="mt-auto pt-6 text-xs leading-5 text-white/28">Every channel shares the same knowledge, customer history, and assistant personality.</p>
        </div>
      </section>
    </div>
  )
}
