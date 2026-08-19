import '../styles/globals.css'
import { ReactNode } from 'react'
import Nav from '../components/Nav'
import ApiBanner from '../components/ApiBanner'

export const metadata = {
  title: 'Fazoo Admin',
  description: 'Admin UI for Fazoo'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <Nav />
          <ApiBanner />
          <main className="max-w-7xl mx-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  )
}
