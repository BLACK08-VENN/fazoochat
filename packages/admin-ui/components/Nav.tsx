'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/assistants', label: 'Assistants' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/knowledge', label: 'Knowledge' }
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(!!session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (pathname === '/login') return null

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05]" style={{
      background: 'linear-gradient(135deg, rgba(10,10,18,0.85) 0%, rgba(15,15,26,0.85) 100%)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <img src="/logo.svg" alt="Fazoo" className="w-7 h-7 transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2), transparent 70%)' }} />
            </div>
            <span className="text-lg font-bold gradient-text-static">Fazoo</span>
          </Link>
          {signedIn && (
            <nav className="flex gap-1">
              {links.map(l => {
                const active = pathname === l.href
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`relative text-[13px] px-4 py-2 rounded-lg transition-all duration-300 tracking-wide ${
                      active
                        ? 'text-white font-medium'
                        : 'text-white/35 hover:text-white/60'
                    }`}
                    style={active ? {
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(147,51,234,0.08))',
                      boxShadow: '0 0 20px rgba(249,115,22,0.08)'
                    } : {}}
                  >
                    {l.label}
                    {active && (
                      <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, #f97316, #9333ea)' }} />
                    )}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
        {signedIn && (
          <button
            onClick={handleSignOut}
            className="text-[12px] text-white/25 hover:text-white/50 transition-all duration-300 tracking-wider uppercase px-3 py-1.5 rounded-lg hover:bg-white/[0.03]"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  )
}
