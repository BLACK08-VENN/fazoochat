import '../../styles/globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Chat',
  description: 'Fazoo chat widget'
}

export default function WidgetLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full m-0">
        {children}
      </body>
    </html>
  )
}
