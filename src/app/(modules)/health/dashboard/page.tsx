'use client'

import ModuleLayout from '@/components/ModuleLayout'
import { Construction } from 'lucide-react'

export default function HealthDashboard() {
  return (
    <ModuleLayout moduleId="health">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <div className="bg-surface p-8 rounded-lg shadow-card border border-edge text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-health-subtle text-module-health mx-auto mb-4">
            <Construction className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">
            Modulo in Sviluppo
          </h2>
          <p className="text-ink-secondary">
            Il modulo Health è in fase di sviluppo e sarà disponibile presto.
          </p>
        </div>
      </div>
    </ModuleLayout>
  )
}
