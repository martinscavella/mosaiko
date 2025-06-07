'use client'

import ModuleLayout from '@/components/ModuleLayout'

export default function TasksDashboard() {
  return (
    <ModuleLayout moduleId="tasks">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Modulo in Sviluppo
          </h2>
          <p className="text-gray-600">
            Il modulo Tasks è in fase di sviluppo e sarà disponibile presto.
          </p>
        </div>
      </div>
    </ModuleLayout>
  )
}
