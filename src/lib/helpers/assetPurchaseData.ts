/**
 * Calcolo costo medio/quantità/performance di un asset dalle sue transazioni
 * di acquisto/vendita. Logica condivisa tra finance/assets (dati dalla cache)
 * e AssetPerformanceChart (dati dall'API /api/transactions) — prima era
 * duplicata quasi identica in entrambi i posti.
 */

export interface NormalizedAssetTransaction {
  transaction_type: 'buy' | 'sell'
  quantity: number
  unit_price: number
  transaction_date: string
}

export interface AssetPurchaseData {
  totalCost: number
  totalQuantity: number
  avgPurchasePrice: number
  firstPurchaseDate: string | null
  hasTransactions: boolean
}

export const EMPTY_PURCHASE_DATA: AssetPurchaseData = {
  totalCost: 0,
  totalQuantity: 0,
  avgPurchasePrice: 0,
  firstPurchaseDate: null,
  hasTransactions: false
}

export function aggregateAssetPurchaseData(
  transactions: NormalizedAssetTransaction[]
): AssetPurchaseData {
  if (transactions.length === 0) {
    return EMPTY_PURCHASE_DATA
  }

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  let totalQuantity = 0
  let totalCostSpent = 0
  let totalQuantityBought = 0
  let firstPurchaseDate: string | null = null

  sorted.forEach(t => {
    if (t.transaction_type === 'buy') {
      totalQuantity += t.quantity
      totalCostSpent += t.quantity * t.unit_price
      totalQuantityBought += t.quantity
      if (!firstPurchaseDate) {
        firstPurchaseDate = t.transaction_date
      }
    } else if (t.transaction_type === 'sell') {
      totalQuantity -= t.quantity
    }
  })

  const avgPurchasePrice = totalQuantityBought > 0 ? totalCostSpent / totalQuantityBought : 0
  const currentCost = totalQuantity * avgPurchasePrice

  return {
    totalCost: Math.max(0, currentCost),
    totalQuantity: Math.max(0, totalQuantity),
    avgPurchasePrice,
    firstPurchaseDate,
    hasTransactions: true
  }
}

/**
 * Converte una transazione grezza (dalla cache finanziaria, con asset_quantity
 * con segno) nella forma normalizzata usata da aggregateAssetPurchaseData.
 * Ritorna null se la transazione non ha una quantità asset valida.
 */
export function normalizeAssetTransaction(t: {
  asset_quantity?: number | null
  current_amount: number
  transaction_date: string
}): NormalizedAssetTransaction | null {
  if (t.asset_quantity === null || t.asset_quantity === undefined) return null

  const isAcquisition = t.asset_quantity > 0

  return {
    transaction_type: isAcquisition ? 'buy' : 'sell',
    quantity: Math.abs(t.asset_quantity),
    unit_price: Math.abs(t.current_amount || 0) / Math.abs(t.asset_quantity || 1),
    transaction_date: t.transaction_date
  }
}
