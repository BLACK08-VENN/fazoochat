'use client'

import { Suspense } from 'react'
import WidgetContent from './WidgetContent'

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)' }}>
        <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WidgetContent />
    </Suspense>
  )
}
