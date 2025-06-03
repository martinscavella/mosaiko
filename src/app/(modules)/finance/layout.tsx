'use client'

interface FinanceLayoutProps {
  children: React.ReactNode
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  // Simple wrapper - navigation is handled by MainNavigation component
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
