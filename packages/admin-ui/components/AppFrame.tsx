'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Nav from './Nav'
import ApiBanner from './ApiBanner'
import { supabase } from '../lib/supabaseClient'

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const isStandalone = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/widget')

  useEffect(() => {
    if (isStandalone) return
    let active = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (!session) {
        setAuthenticated(false)
        router.replace('/login')
        return
      }
      setAuthenticated(true)
    }).catch(() => {
      if (!active) return
      setAuthenticated(false)
      router.replace('/login')
    })
    return () => { active = false }
  }, [isStandalone, router])

  if (isStandalone) return <>{children}</>

  if (authenticated !== true) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#09080f]">
        <div className="flex items-center gap-3 text-sm text-white/35"><span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-400" />Opening your workspace…</div>
      </main>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="app-content">
        <ApiBanner />
        <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
