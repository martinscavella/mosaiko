'use client'

import ModuleLayout from '@/components/ModuleLayout'

export default function FinanceDashboard() {
  return (
    <ModuleLayout moduleId="finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Saldo Totale */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Saldo Totale</h3>
            <p className="text-2xl font-bold text-gray-900">€0.00</p>
          </div>

          {/* Entrate Mensili */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Entrate Mensili</h3>
            <p className="text-2xl font-bold text-green-600">€0.00</p>
          </div>

          {/* Uscite Mensili */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Uscite Mensili</h3>
            <p className="text-2xl font-bold text-red-600">€0.00</p>
          </div>

          {/* Tasso di Risparmio */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Tasso di Risparmio</h3>
            <p className="text-2xl font-bold text-blue-600">0%</p>
          </div>
        </div>
      </div>
    </ModuleLayout>
  )
}
