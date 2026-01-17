'use client'

import ModuleLayout from '@/components/ModuleLayout'

export default function LearningDashboard() {
  return (
    <ModuleLayout moduleId="learning">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Modulo in Sviluppo
          </h2>
          <p className="text-gray-600">
            Il modulo Learning è in fase di sviluppo e sarà disponibile presto.
          </p>
        </div>
      </div>
    </ModuleLayout>
  )
}
