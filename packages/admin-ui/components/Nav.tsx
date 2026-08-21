'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

const links = [
  { href: '/', label: 'Overview', icon: 'home' },
  { href: '/assistants', label: 'Assistants', icon: 'spark' },
  { href: '/conversations', label: 'Conversations', icon: 'chat' },
  { href: '/knowledge', label: 'Knowledge', icon: 'book' },
  { href: '/customers', label: 'Customers', icon: 'users' },
  { href: '/whatsapp', label: 'WhatsApp', icon: 'phone' },
  { href: '/analytics', label: 'Analytics', icon: 'chart' },
  { href: '/settings', label: 'Settings', icon: 'settings' }
]

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
    spark: <><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"/><path d="M8 7h8M8 11h6"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>,
    chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34A1.7 1.7 0 0 0 14 20.93V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.07 14H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.07V3h4v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9 1.7 1.7 0 0 0 20.93 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">{paths[name]}</svg>
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(Boolean(session)))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!signedIn) return null

  return (
    <aside className="app-sidebar">
      <div className="flex h-20 items-center border-b border-white/[0.06] px-5 lg:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Fazoo overview">
          <span className="brand-mark"><img src="/logo.svg" alt="" className="h-7 w-7" /></span>
          <span><span className="block text-[17px] font-semibold tracking-[-0.02em] text-white">fazoo</span><span className="hidden text-[9px] font-medium uppercase tracking-[0.22em] text-white/30 lg:block">Customer AI</span></span>
        </Link>
      </div>

      <nav className="nav-scroll flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:py-5" aria-label="Main navigation">
        {links.map(link => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
          return <Link key={link.href} href={link.href} className={`nav-item ${active ? 'nav-item-active' : ''}`} aria-current={active ? 'page' : undefined}><Icon name={link.icon} /><span>{link.label}</span></Link>
        })}
      </nav>

      <div className="hidden border-t border-white/[0.06] p-3 lg:block">
        <div className="mb-3 rounded-xl border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2.5"><div className="flex items-center gap-2 text-[11px] text-emerald-200/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />Systems connected</div></div>
        <button onClick={handleSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/35 transition hover:bg-white/[0.04] hover:text-white/70"><span className="text-base">→</span> Sign out</button>
      </div>
    </aside>
  )
}
