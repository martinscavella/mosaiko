'use client'

import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface ModulesLayoutProps {
  children: React.ReactNode
}

export default function ModulesLayout({ children }: ModulesLayoutProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
