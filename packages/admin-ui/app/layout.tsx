import '../styles/globals.css'
import { ReactNode } from 'react'
import AppFrame from '../components/AppFrame'

export const metadata = {
  title: 'Fazoo — AI customer conversations',
  description: 'Build, train and operate AI assistants across web and WhatsApp.'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  )
}
