'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import { useAuth } from '@/lib/auth'
import { useGroceryData } from '../groceryData'
import { ShoppingBasket, Package, ShoppingCart, Receipt, AlertTriangle } from 'lucide-react'

const SECTIONS = [
  { href: '/grocery/pantry', icon: Package, title: 'Dispensa', desc: 'Catalogo articoli e giacenze correnti' },
  { href: '/grocery/shopping-list', icon: ShoppingCart, title: 'Lista della spesa', desc: 'Aggiunta rapida, spunta e carico in dispensa' },
  { href: '/grocery/receipts', icon: Receipt, title: 'Scontrini e prezzi', desc: 'Esplodi una spesa in righe e traccia i prezzi' },
] as const

export default function GroceryDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { data, loading, error } = useGroceryData()

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const shoppingList = useMemo(() => data?.shoppingList ?? [], [data?.shoppingList])

  const lowStock = useMemo(
    () => items.filter(i => i.min_quantity != null && i.current_quantity <= i.min_quantity),
    [items]
  )
  const toBuy = useMemo(() => shoppingList.filter(e => !e.is_checked), [shoppingList])

  if (!authLoading && !user) {
    router.push('/auth/login')
    return null
  }

  return (
    <ModuleLayout moduleId="grocery">
      <div className="max-w-7xl 3xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ModuleHeader
          title="Spesa"
          subtitle="Dispensa virtuale, lista della spesa e storico prezzi"
          icon={<ShoppingBasket className="w-5 h-5" />}
          stats={[
            { label: 'Articoli', value: String(items.length), color: 'green' },
            { label: 'Da comprare', value: String(toBuy.length), color: 'orange' },
          ]}
        />

        {error && (
          <div className="mb-6 bg-danger-subtle border border-danger-subtle rounded-lg p-4 text-sm text-danger">
            Errore nel caricamento: {error}
          </div>
        )}

        {/* Avviso sotto scorta */}
        {lowStock.length > 0 && (
          <button
            onClick={() => router.push('/grocery/pantry')}
            className="w-full mb-6 flex items-center gap-3 bg-warning-subtle border border-warning-subtle rounded-lg p-4 text-left hover:brightness-95 transition-all"
          >
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <p className="text-sm text-ink">
              <span className="font-semibold">{lowStock.length} articol{lowStock.length === 1 ? 'o' : 'i'}</span> sotto la scorta minima
            </p>
          </button>
        )}

        {/* Sezioni */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-4">Sezioni</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTIONS.map(section => {
              const Icon = section.icon
              return (
                <button
                  key={section.href}
                  onClick={() => router.push(section.href)}
                  className="bg-surface border border-edge rounded-lg shadow-card p-5 text-left hover:border-module-grocery transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-module-grocery-subtle text-module-grocery shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink">{section.title}</h3>
                      <p className="text-sm text-ink-muted">{section.desc}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {!loading && items.length === 0 && (
          <div className="mt-6 bg-surface border border-edge rounded-lg shadow-card p-8 text-center">
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-module-grocery-subtle text-module-grocery mx-auto mb-4">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-1">Inizia dalla dispensa</h3>
            <p className="text-sm text-ink-secondary mb-4">Aggiungi i tuoi articoli: potrai gestire le giacenze e la lista della spesa.</p>
            <button
              onClick={() => router.push('/grocery/pantry')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-primary hover:bg-primary-hover text-white transition-all active:scale-95"
            >
              Vai alla dispensa
            </button>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}
