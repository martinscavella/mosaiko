'use client'

interface ModuleLayoutProps {
  children: React.ReactNode
  moduleId?: string
}

export default function ModuleLayout({ children }: ModuleLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Module Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
