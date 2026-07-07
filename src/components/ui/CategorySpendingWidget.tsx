'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PieChart } from 'lucide-react'
import { useFinanceCache } from '@/lib/financeCache'
import { formatCurrency } from '@/lib/helpers/format'

const TOP_N = 5

/**
 * Spese per categoria del mese corrente: top 5 con barre orizzontali.
 * Ranking di grandezza su tinta unica (identità data dalle etichette).
 */
export default function CategorySpendingWidget() {
  const router = useRouter()
  const { data, loading } = useFinanceCache()

  const { rows, total, monthLabel } = useMemo(() => {
    const monthYear = data?.stats?.monthYear
    if (!data?.transactions?.length || !monthYear) {
      return { rows: [], total: 0, monthLabel: data?.stats?.currentMonth ?? '' }
    }

    const totals = new Map<string, number>()
    for (const t of data.transactions) {
      const amount = Number(t.current_amount || 0)
      // Solo spese reali del mese (gli acquisti asset non sono spese)
      if (amount >= 0 || t.asset_id) continue
      if (t.transaction_date.slice(0, 7) !== monthYear) continue
      const name = t.categories?.name || 'Altro'
      totals.set(name, (totals.get(name) || 0) + Math.abs(amount))
    }

    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const top = sorted.slice(0, TOP_N)
    const restTotal = sorted.slice(TOP_N).reduce((sum, [, v]) => sum + v, 0)
    if (restTotal > 0) top.push(['Altre categorie', restTotal])

    const totalExpenses = sorted.reduce((sum, [, v]) => sum + v, 0)
    return {
      rows: top.map(([name, value]) => ({ name, value })),
      total: totalExpenses,
      monthLabel: data.stats.currentMonth,
    }
  }, [data])

  if (loading) {
    return (
      <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-inset rounded-lg" />
            <div className="h-4 bg-inset rounded w-40" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-inset rounded" style={{ width: `${85 - i * 15}%` }} />
          ))}
        </div>
      </div>
    )
  }

  const max = rows.length ? rows[0].value : 0

  return (
    <div className="bg-surface border border-edge rounded-lg shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-danger-subtle text-danger">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Spese per Categoria</h3>
            <p className="text-sm text-ink-muted">{monthLabel}</p>
          </div>
        </div>
        {total > 0 && (
          <span className="text-sm font-semibold font-amount text-ink">{formatCurrency(total)}</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">Nessuna spesa registrata questo mese</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(row => {
            const isRest = row.name === 'Altre categorie'
            const pct = total > 0 ? (row.value / total) * 100 : 0
            return (
              <li key={row.name}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className={isRest ? 'text-sm text-ink-muted' : 'text-sm text-ink-secondary'}>
                    {row.name}
                  </span>
                  <span className="text-sm font-medium font-amount text-ink shrink-0">
                    {formatCurrency(row.value)}
                    <span className="text-ink-muted font-sans font-normal"> · {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="w-full bg-inset rounded-full h-2 overflow-hidden">
                  <div
                    className={isRest ? 'h-2 rounded-full bg-ink-muted' : 'h-2 rounded-full bg-primary'}
                    style={{ width: `${max > 0 ? Math.max((row.value / max) * 100, 2) : 0}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {rows.length > 0 && (
        <button
          onClick={() => router.push('/finance/reports')}
          className="mt-4 text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Vedi report completo →
        </button>
      )}
    </div>
  )
}
