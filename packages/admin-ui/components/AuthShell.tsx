import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AuthShell({ mode, children }: { mode: 'login' | 'signup'; children: ReactNode }) {
  const login = mode === 'login'
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/" className="relative z-10 flex items-center gap-3" aria-label="Fazoo home">
          <span className="brand-mark"><img src="/logo.svg" alt="" className="h-7 w-7" /></span>
          <span className="text-xl font-semibold tracking-[-0.03em] text-white">fazoo</span>
        </Link>

        <div className="relative z-10 my-auto max-w-lg py-16">
          <p className="eyebrow mb-5 text-orange-300/70">Customer conversations, reimagined</p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl">
            Turn every question into a moment of trust.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-white/45">
            Train one AI assistant on your business, then serve customers across your website and WhatsApp from one calm workspace.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {['Your knowledge', 'Every channel', 'One inbox'].map((item, index) => (
              <div key={item} className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                <span className="mb-2 block text-xs font-semibold text-orange-300/65">0{index + 1}</span>
                <span className="text-xs font-medium text-white/55">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/22">© 2026 Fazoo. Built for better conversations.</p>
      </section>

      <section className="auth-form-panel">
        <div className="w-full max-w-[430px] animate-fade-in-up">
          <div className="mb-9">
            <p className="eyebrow mb-3">{login ? 'Welcome back' : 'Start building'}</p>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-white">{login ? 'Sign in to Fazoo' : 'Create your workspace'}</h2>
            <p className="mt-2 text-sm leading-6 text-white/38">{login ? 'Continue managing your customer conversations.' : 'Launch your first AI assistant in a few minutes.'}</p>
          </div>
          {children}
          <p className="mt-7 text-center text-sm text-white/35">
            {login ? 'New to Fazoo?' : 'Already have an account?'}{' '}
            <Link href={login ? '/signup' : '/login'} className="font-medium text-orange-300 transition hover:text-orange-200">{login ? 'Create an account' : 'Sign in'}</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
