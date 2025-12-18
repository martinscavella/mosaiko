'use client'

import { useEffect } from 'react'
import { setupIOSPWA } from '@/lib/iosHelper'

export function IOSPWASetup() {
  useEffect(() => {
    setupIOSPWA()
  }, [])

  return null // This component doesn't render anything
}
