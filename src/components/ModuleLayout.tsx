'use client'

interface ModuleLayoutProps {
  children: React.ReactNode
  moduleId: string
}

export default function ModuleLayout({ children, moduleId }: ModuleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Module Content */}
      <main>
        {children}
      </main>
    </div>
  )
}
