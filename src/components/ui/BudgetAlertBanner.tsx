'use client'

import { AlertTriangle, X } from 'lucide-react'
import { formatCurrency } from '@/lib/helpers/format'
import { useState } from 'react'

interface BudgetAlertBannerProps {
  overBudgetCategories: Array<{
    name: string
    budget: number
    spent: number
  }>
}

export default function BudgetAlertBanner({
  overBudgetCategories
}: BudgetAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (overBudgetCategories.length === 0 || dismissed) {
    return null
  }

  return (
    <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Avviso Budget</h3>
            <p className="mt-1 text-sm text-red-800">
              {overBudgetCategories.length === 1
                ? `La categoria "${overBudgetCategories[0].name}" ha superato il budget`
                : `${overBudgetCategories.length} categorie hanno superato il budget`}
            </p>
            <div className="mt-2 space-y-1">
              {overBudgetCategories.map((cat) => (
                <p key={cat.name} className="text-xs text-red-700">
                  <strong>{cat.name}:</strong> Speso {formatCurrency(cat.spent)} su{' '}
                  {formatCurrency(cat.budget)}
                  <span className="ml-1">
                    (+{formatCurrency(cat.spent - cat.budget)})
                  </span>
                </p>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-600 hover:text-red-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
