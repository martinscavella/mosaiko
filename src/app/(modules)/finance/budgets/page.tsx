'use client'

import { useState, useMemo } from 'react'
import ModuleLayout from '@/components/ModuleLayout'
import ModuleHeader from '@/components/ui/ModuleHeader'
import CacheStatus from '@/components/ui/CacheStatus'
import { useAuth } from '@/lib/auth'
import { useCategories, useCategoryOperations, useFinanceCache, useAllTransactions } from '@/lib/financeCache'
import { formatCurrency, formatPercentage } from '@/lib/helpers/format'
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Search,
  Filter,
  Save,
  X,
  ChevronDown,
  Calendar
} from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface CategoryFormData {
  name: string
  monthly_budget: string
  icon: string
}

const CATEGORY_ICONS = [
  '🍕', '🏠', '🚗', '💡', '🛒', '🍔', '☕', '🎬', '💊', '📚',
  '🎵', '✈️', '🏥', '👕', '🎮', '💻', '📱', '🏃', '🎨', '🍷'
]

export default function BudgetsPage() {
  const { user, loading: authLoading } = useAuth()
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories()
  const { createCategory, updateCategory, deleteCategory } = useCategoryOperations()
  const { data: financeData, refetch: refetchFinance } = useFinanceCache()
  const { transactions } = useAllTransactions()
  const supabase = createClientComponentClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState<any>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    monthly_budget: '',
    icon: '💰'
  })
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [sortBy, setSortBy] = useState<'budget' | 'name' | 'spent'>('budget')

  // Calcoli per statistiche budget mensili
  const budgetStats = useMemo(() => {
    const monthlyCategories = categories.map(cat => {
      // Filtra transazioni del mese selezionato per questa categoria
      const monthlyTransactions = transactions?.filter(t =>
        t.categories?.name === cat.name &&
        new Date(t.transaction_date).getMonth() === selectedMonth &&
        new Date(t.transaction_date).getFullYear() === selectedYear &&
        t.current_amount < 0 // Solo spese (importi negativi)
      ) || []

      const monthlySpent = Math.abs(monthlyTransactions.reduce((sum, t) => sum + t.current_amount, 0))

      return {
        ...cat,
        monthly_spent: monthlySpent,
        monthly_transaction_count: monthlyTransactions.length,
        remaining: cat.monthly_budget ? cat.monthly_budget - monthlySpent : 0,
        utilization: cat.monthly_budget ? (monthlySpent / cat.monthly_budget) * 100 : 0
      }
    })

    // Ordina le categorie
    const sortedCategories = [...monthlyCategories].sort((a, b) => {
      switch (sortBy) {
        case 'budget':
          // Prima categorie con budget impostato, poi per importo budget decrescente
          if (a.monthly_budget && !b.monthly_budget) return -1
          if (!a.monthly_budget && b.monthly_budget) return 1
          if (a.monthly_budget && b.monthly_budget) {
            return b.monthly_budget - a.monthly_budget
          }
          return a.name.localeCompare(b.name)
        case 'spent':
          return b.monthly_spent - a.monthly_spent
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    const totalBudget = sortedCategories.reduce((sum, cat) => sum + (cat.monthly_budget || 0), 0)
    const totalSpent = sortedCategories.reduce((sum, cat) => sum + cat.monthly_spent, 0)
    const overBudgetCategories = sortedCategories.filter(cat => cat.monthly_budget && cat.monthly_spent > cat.monthly_budget)
    const underBudgetCategories = sortedCategories.filter(cat => cat.monthly_budget && cat.monthly_spent <= cat.monthly_budget)

    return {
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      overBudgetCount: overBudgetCategories.length,
      underBudgetCount: underBudgetCategories.length,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      monthlyCategories: sortedCategories
    }
  }, [categories, transactions, selectedMonth, selectedYear, sortBy])

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      await createCategory({
        name: formData.name.trim(),
        monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
        icon: formData.icon
      })

      await refetchCategories()
      await refetchFinance()

      setShowAddModal(false)
      setFormData({ name: '', monthly_budget: '', icon: '💰' })
    } catch (error) {
      console.error('Errore nella creazione della categoria:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) return

    setSaving(true)
    try {
      await updateCategory(editingCategory.id, {
        name: formData.name.trim(),
        monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
        icon: formData.icon
      })

      await refetchCategories()
      await refetchFinance()

      setShowEditModal(false)
      setEditingCategory(null)
      setFormData({ name: '', monthly_budget: '', icon: '💰' })
    } catch (error) {
      console.error('Errore nell\'aggiornamento della categoria:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    setSaving(true)
    try {
      await deleteCategory(deletingCategory.id)

      await refetchCategories()
      await refetchFinance()

      setShowDeleteModal(false)
      setDeletingCategory(null)
    } catch (error) {
      console.error('Errore nell\'eliminazione della categoria:', error)
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (category: any) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      monthly_budget: category.monthly_budget?.toString() || '',
      icon: category.icon || '💰'
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (category: any) => {
    setDeletingCategory(category)
    setShowDeleteModal(true)
  }

  if (authLoading || categoriesLoading) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  if (!user) {
    return (
      <ModuleLayout moduleId="finance">
        <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8">
          <div className="text-center">
            <p className="text-gray-500">Devi effettuare il login per gestire i budget</p>
          </div>
        </div>
      </ModuleLayout>
    )
  }

  return (
    <ModuleLayout moduleId="finance">
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #CBD5E0 #EDF2F7;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #EDF2F7;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>
      <div className="max-w-7xl 3xl:max-w-[1600px] 4xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 3xl:px-10 py-8 custom-scrollbar">
        <ModuleHeader
          title={`Budget e Categorie - ${new Date(selectedYear, selectedMonth).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`}
          subtitle="Gestisci i tuoi budget mensili e organizza le tue spese per categoria"
          icon={<Target className="h-6 w-6 text-white" />}
          actions={[
            {
              label: 'Nuova Categoria',
              icon: <Plus className="w-4 h-4" />,
              onClick: () => setShowAddModal(true),
              color: 'blue'
            }
          ]}
        />

        <CacheStatus />

        {/* Controlli filtro e ordinamento */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Selettore mese */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2024, i).toLocaleDateString('it-IT', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selettore anno */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Ordinamento */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'budget' | 'name' | 'spent')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="budget">Ordina per Budget</option>
                <option value="spent">Ordina per Spesa</option>
                <option value="name">Ordina per Nome</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistiche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Budget Totale</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(budgetStats.totalBudget)}</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spesa Totale</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(budgetStats.totalSpent)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rimanente</p>
                <p className={`text-2xl font-bold ${budgetStats.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(budgetStats.remaining)}
                </p>
              </div>
              {budgetStats.remaining >= 0 ? (
                <TrendingDown className="h-8 w-8 text-green-600" />
              ) : (
                <TrendingUp className="h-8 w-8 text-red-600" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilizzo Budget</p>
                <p className={`text-2xl font-bold ${budgetStats.budgetUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatPercentage(budgetStats.budgetUtilization)}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Lista Categorie */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Categorie ({budgetStats.monthlyCategories.length})</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {budgetStats.monthlyCategories.map((category) => {
              const budget = category.monthly_budget || 0
              const spent = category.monthly_spent
              const remaining = budget - spent
              const utilization = budget > 0 ? (spent / budget) * 100 : 0
              const isOverBudget = budget > 0 && spent > budget

              return (
                <div key={category.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{category.icon || '💰'}</div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                        <p className="text-sm text-gray-500">
                          {category.monthly_transaction_count} transazioni • Spesa mese: {formatCurrency(spent)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {budget > 0 && (
                        <div className="text-right">
                          <div className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(remaining)} rimanenti
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(utilization)} utilizzato
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(category)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {budget > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progresso budget mensile</span>
                        <span>{formatCurrency(spent)} / {formatCurrency(budget)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isOverBudget ? 'bg-red-500' : utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {budgetStats.monthlyCategories.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna categoria</h3>
              <p className="mt-1 text-sm text-gray-500">Inizia creando la tua prima categoria di spesa.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Categoria
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Crea Categoria */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Nuova Categoria</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. Alimentazione"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Mensile (€)</label>
                  <input
                    type="number"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icona</label>
                  <div className="grid grid-cols-10 gap-2">
                    {CATEGORY_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg border-2 ${
                          formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateCategory}
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crea Categoria
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Categoria */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Modifica Categoria</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Mensile (€)</label>
                  <input
                    type="number"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icona</label>
                  <div className="grid grid-cols-10 gap-2">
                    {CATEGORY_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg border-2 ${
                          formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateCategory}
                  disabled={saving || !formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salva Modifiche
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Elimina Categoria */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Elimina Categoria</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sei sicuro di voler eliminare la categoria "{deletingCategory?.name}"?
                  Questa azione non può essere annullata.
                </p>
                {deletingCategory?.transaction_count > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Questa categoria ha {deletingCategory.transaction_count} transazioni associate.
                      L'eliminazione non rimuoverà le transazioni, ma potrebbero diventare "non categorizzate".
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeleteCategory}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Elimina
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModuleLayout>
  )
}