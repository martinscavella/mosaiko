'use client'

import ModuleLayout from '@/components/ModuleLayout'
import { Construction } from 'lucide-react'

export default function LearningDashboard() {
  return (
    <ModuleLayout moduleId="learning">
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 mx-auto mb-4">
            <Construction className="w-7 h-7" />
          </div>
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
