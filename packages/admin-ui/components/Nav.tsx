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
    <header className="glass-strong sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Fazoo" className="w-7 h-7" />
            <span className="text-lg font-bold gradient-text">Fazoo</span>
          </Link>
          {signedIn && (
            <nav className="flex gap-1">
              {links.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    pathname === l.href
                      ? 'text-white font-medium'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                  style={pathname === l.href ? { background: 'rgba(249,115,22,0.2)' } : {}}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        {signedIn && (
          <button onClick={handleSignOut} className="text-sm text-white/40 hover:text-white/70 transition-colors">Sign out</button>
        )}
      </div>
    </header>
  )
}
