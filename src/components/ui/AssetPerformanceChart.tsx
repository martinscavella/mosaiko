'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { formatCurrency } from '@/lib/helpers/format'
import { aggregateAssetPurchaseData } from '@/lib/helpers/assetPurchaseData'
import { chartColors, chartAxisTick } from '@/lib/chartTheme'

interface PerformanceDataPoint {
  date: string
  value: number
}

interface Transaction {
  id: string
  asset_id: string
  transaction_type: 'buy' | 'sell'
  quantity: number
  unit_price: number
  transaction_date: string
}

interface Asset {
  id: string
  name: string
  type: string
  quantity: number
  value: number
  currency: string
  account_id: string | null
  created_at: string
  updated_at: string
  user_id: string
  symbol?: string | null
}

interface AssetPerformanceChartProps {
  asset: Asset
  className?: string
}

export default function AssetPerformanceChart({ 
  asset,
  className = '' 
}: AssetPerformanceChartProps) {  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(0)
  const [totalCost, setTotalCost] = useState<number>(0)
  const [totalQuantity, setTotalQuantity] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  // Cache keys per sessionStorage
  const getCacheKey = useCallback((type: 'transactions' | 'price' | 'history', extraKey?: string) => {
    const base = `mosaiko_${type}_${asset.id}`
    return extraKey ? `${base}_${extraKey}` : base
  }, [asset.id])
  // Funzione per recuperare le transazioni dell'asset con cache
  const fetchTransactions = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey('transactions')
    
    // Controlla se ci sono dati in cache e non è un refresh forzato
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        setTransactions(data.transactions)
        setTotalCost(data.totalCost)
        setTotalQuantity(data.totalQuantity || 0)
        setLastUpdated(data.timestamp)
        return
      }
    }

    try {
      const response = await fetch(`/api/transactions?asset_id=${asset.id}`)

      if (response.ok) {
        const data = await response.json()
        setTransactions(data)

        const { totalQuantity, totalCost } = aggregateAssetPurchaseData(data)

        setTotalQuantity(totalQuantity)
        setTotalCost(totalCost)

        // Salva in cache con timestamp
        const cacheData = {
          transactions: data,
          totalCost,
          totalQuantity,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
        setLastUpdated(cacheData.timestamp)
      } else {
        const errorData = await response.json()
        console.error('Errore API transazioni asset:', errorData)
      }
    } catch (error) {
      console.error('Errore nel recupero delle transazioni asset:', error)
    }
  }, [asset.id, getCacheKey])
  // Funzione per recuperare il prezzo di mercato attuale con cache
  const fetchCurrentPrice = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey('price')
    
    // Controlla se ci sono dati in cache e non è un refresh forzato
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        setCurrentMarketPrice(data.price)
        setLastUpdated(data.timestamp)
        return
      }
    }

    if (asset.type === 'Buono Fruttifero') {
      setCurrentMarketPrice(0)
      return
    }

    // Verifica se l'asset ha un simbolo definito
    if (!asset.symbol) {
      setCurrentMarketPrice(0)
      return
    }

    try {
      const response = await fetch(`/api/market-price?symbol=${asset.symbol}&type=${asset.type}`)

      if (response.ok) {
        const data = await response.json()
        setCurrentMarketPrice(data.price)

        // Salva in cache con timestamp
        const cacheData = {
          price: data.price,
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
        setLastUpdated(cacheData.timestamp)
      } else {
        const errorData = await response.json()
        console.warn(`Impossibile recuperare il prezzo per ${asset.symbol}:`, errorData)
        setCurrentMarketPrice(0)
      }
    } catch (error) {
      console.error('Errore nel recupero del prezzo di mercato:', error)
      setCurrentMarketPrice(0)
    }
  }, [asset.type, asset.symbol, getCacheKey])
  // Funzione per refresh manuale dei dati
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        fetchTransactions(true),
        fetchCurrentPrice(true)
      ])
    } catch (error) {
      console.error('Errore durante il refresh manuale:', error)
    } finally {
      setRefreshing(false)
    }
  }, [fetchTransactions, fetchCurrentPrice])

  // Carica i dati iniziali (senza forzare refresh)
  useEffect(() => {
    fetchTransactions(false)
    fetchCurrentPrice(false)
  }, [asset.id, fetchTransactions, fetchCurrentPrice])  // Genera dati di performance del PORTAFOGLIO (non solo prezzo asset)
  useEffect(() => {
    if (transactions.length === 0) return

    const calculatePortfolioPerformance = async () => {
      setLoading(true)
      
      try {
        // Per i Buoni Fruttiferi, il valore rimane costante (valore nominale)
        if (asset.type === 'Buono Fruttifero') {
          // Calcola il valore totale investito nel tempo
          const sortedTransactions = transactions.sort((a, b) => 
            new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          )
          
          let cumulativeValue = 0
          const portfolioData: PerformanceDataPoint[] = []
          
          sortedTransactions.forEach(transaction => {
            cumulativeValue += transaction.quantity * transaction.unit_price
            portfolioData.push({
              date: transaction.transaction_date,
              value: cumulativeValue
            })
          })
          
          // Aggiungi il punto finale con il valore attuale
          portfolioData.push({
            date: new Date().toISOString().split('T')[0],
            value: cumulativeValue
          })
          
          setPerformanceData(portfolioData)
          setLoading(false)
          return
        }

        // Per asset con mercato: calcola il valore del portafoglio nel tempo
        const sortedTransactions = transactions.sort((a, b) => 
          new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        )
        
        const startDate = new Date(sortedTransactions[0].transaction_date)
        const endDate = new Date()
        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Calcola il range di giorni basato sulla selezione
        let daysToFetch = daysDiff
        switch (timeRange) {
          case '1M':
            daysToFetch = Math.min(30, daysDiff)
            startDate.setTime(endDate.getTime() - (30 * 24 * 60 * 60 * 1000))
            break
          case '3M':
            daysToFetch = Math.min(90, daysDiff)
            startDate.setTime(endDate.getTime() - (90 * 24 * 60 * 60 * 1000))
            break
          case '6M':
            daysToFetch = Math.min(180, daysDiff)
            startDate.setTime(endDate.getTime() - (180 * 24 * 60 * 60 * 1000))
            break
          case '1Y':
            daysToFetch = Math.min(365, daysDiff)
            startDate.setTime(endDate.getTime() - (365 * 24 * 60 * 60 * 1000))        }

        // Controlla se ci sono dati in cache per questo range
        const cacheKey = getCacheKey('history', `${timeRange}_${daysToFetch}`)
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached)
          setPerformanceData(data.data)
          setLastUpdated(data.timestamp)
          setLoading(false)
          return
        }

        // Verifica che l'asset abbia un simbolo definito
        if (!asset.symbol) {
          console.warn(`Asset ${asset.name} non ha un simbolo definito per lo storico prezzi`)
          return
        }

        // Recupera lo storico prezzi dall'API
        const response = await fetch(`/api/price-history?symbol=${asset.symbol}&type=${asset.type}&days=${daysToFetch}`)

        if (response.ok) {
          const historyData = await response.json()
            // Calcola il valore del portafoglio giorno per giorno
          const portfolioData: PerformanceDataPoint[] = []
          
          // Ordina le transazioni per data
          const sortedTransactions = transactions.sort((a, b) => 
            new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          )
          
          // Per ogni prezzo storico, calcola quante quote avevi quel giorno
          historyData.forEach((pricePoint: {date: string, price: number}) => {
            const pointDate = new Date(pricePoint.date)
            
            // Calcola quante quote avevi a quella data
            let quantityAtDate = 0
            sortedTransactions.forEach(transaction => {
              const transactionDate = new Date(transaction.transaction_date)
              if (transactionDate <= pointDate) {
                quantityAtDate += transaction.quantity
              }
            })
            
            // Se avevi delle quote, calcola il valore del portafoglio
            if (quantityAtDate > 0) {
              const portfolioValue = quantityAtDate * pricePoint.price
              portfolioData.push({
                date: pricePoint.date,
                value: portfolioValue
              })
            }
          })
          
          setPerformanceData(portfolioData)
          
          // Salva in cache con timestamp
          const cacheKey = getCacheKey('history', `${timeRange}_${daysToFetch}`)
          const cacheData = {
            data: portfolioData,
            timestamp: new Date().toISOString()
          }
          sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
          setLastUpdated(cacheData.timestamp)
          
        } else {
          console.warn('API failed, no portfolio data available')
          setPerformanceData([])
        }
        
      } catch (error) {
        console.error('Error calculating portfolio performance:', error)
        setPerformanceData([])
      }
        setLoading(false)
    }

    calculatePortfolioPerformance()
  }, [asset.id, asset.type, asset.name, asset.symbol, timeRange, transactions, totalCost, totalQuantity, getCacheKey])

  const calculatePerformance = () => {
    // Per i Buoni Fruttiferi, non c'è gain/loss
    if (asset.type === 'Buono Fruttifero') {
      return { percentage: 0, isPositive: true, absoluteGain: 0, currentValue: totalCost }
    }
    
    // Se non c'è prezzo di mercato disponibile, non possiamo calcolare la performance
    if (currentMarketPrice === 0) {
      console.warn(`Prezzo di mercato non disponibile per ${asset.name} (symbol: ${asset.symbol})`)
      return { 
        percentage: 0, 
        isPositive: true, 
        absoluteGain: 0, 
        currentValue: 0,
        noPriceData: true 
      }
    }
    
    // Calcola il valore attuale del portafoglio
    const currentValue = currentMarketPrice * totalQuantity
    
    // Calcola il guadagno/perdita assoluto
    const absoluteGain = currentValue - totalCost
    
    // Calcola il ROI: (Valore Attuale - Capitale Investito) / Capitale Investito * 100
    const percentage = totalCost > 0 ? (absoluteGain / totalCost) * 100 : 0
    
    return { 
      percentage: percentage, 
      isPositive: percentage >= 0,
      absoluteGain: absoluteGain,
      currentValue: currentValue,
      noPriceData: false
    }
  }
  
  const performance = calculatePerformance()

  return (
    <div className={`bg-surface rounded-lg border border-edge p-6 ${className}`}>      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">{asset.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {performance.isPositive ? (
              <TrendingUp className="w-4 h-4 text-success-strong" />
            ) : (
              <TrendingDown className="w-4 h-4 text-danger" />
            )}
            <span className={`text-sm font-medium ${performance.isPositive ? 'text-success-strong' : 'text-danger'}`}>
              {performance.percentage > 0 ? '+' : ''}{performance.percentage.toFixed(2)}%
            </span>
            <span className="text-sm text-ink-muted">
              ({timeRange})
            </span>
            {lastUpdated && (
              <span className="text-xs text-ink-muted">
                Aggiornato: {new Date(lastUpdated).toLocaleTimeString('it-IT')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-2 rounded-lg transition-colors ${
              refreshing 
                ? 'bg-inset text-ink-muted cursor-not-allowed' 
                : 'bg-primary-subtle text-primary hover:bg-primary-subtle'
            }`}
            title="Aggiorna dati"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex gap-1">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  timeRange === range 
                    ? 'bg-primary-subtle text-primary-hover' 
                    : 'text-ink-muted hover:text-ink-secondary hover:bg-inset'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : performanceData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-ink-muted">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
            <p>Nessun dato disponibile</p>
          </div>
        </div>      ) : (
        <div className="h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={performanceData.map(point => ({
                date: point.date,
                value: point.value,
                formattedDate: new Date(point.date).toLocaleDateString('it-IT', { 
                  month: 'short', 
                  day: 'numeric' 
                })
              }))}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false}
                tickLine={false}
                tick={chartAxisTick}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={chartAxisTick}
                tickFormatter={(value) => formatCurrency(value)}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-surface p-3 border border-edge rounded-lg shadow-elevated">
                        <p className="text-sm text-ink-secondary">{label}</p>
                        <p className="text-sm font-semibold">
                          <span className={performance.isPositive ? 'text-success-strong' : 'text-danger'}>
                            {formatCurrency(payload[0].value as number)}
                          </span>
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={performance.isPositive ? chartColors.success : chartColors.danger}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: performance.isPositive ? chartColors.success : chartColors.danger,
                  strokeWidth: 2,
                  stroke: chartColors.surface
                }}
              />
              {/* Linea di riferimento per il break-even se necessario */}
              {totalCost > 0 && (
                <ReferenceLine
                  y={totalCost}
                  stroke={chartColors.axis}
                  strokeDasharray="3 3" 
                  strokeOpacity={0.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Date labels - ora gestite direttamente da Recharts */}
        </div>
      )}        <div className="mt-4 pt-4 border-t border-edge-subtle space-y-4">
          {/* Avviso se non ci sono dati di prezzo */}
          {performance.noPriceData && (
            <div className="bg-warning-subtle border border-warning-subtle rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <p className="text-sm text-warning">
                  <strong>Prezzo di mercato non disponibile</strong>
                </p>
              </div>
              <p className="text-xs text-warning mt-1">
                L'asset non ha un simbolo valido configurato ({asset.symbol || 'nessun simbolo'}) o il servizio di quotazioni non è raggiungibile. 
                Le metriche di performance sono temporaneamente non disponibili.
              </p>
            </div>
          )}

          {/* Prima riga: Valori fondamentali */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm text-ink-secondary mb-1">Valore Attuale Portafoglio</span>
              <p className="text-lg font-bold text-ink">
                {performance.noPriceData ? (
                  <span className="text-ink-muted">Non disponibile</span>
                ) : (
                  formatCurrency(performance.currentValue)
                )}
              </p>
            </div>
            <div>
              <span className="block text-sm text-ink-secondary mb-1">Capitale Investito</span>
              <p className="text-lg font-bold text-ink">{formatCurrency(totalCost)}</p>
            </div>
          </div>

          {/* Seconda riga: Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm text-ink-secondary mb-1">Guadagno/Perdita Assoluto</span>
              <p className={`text-lg font-bold ${
                performance.noPriceData ? 'text-ink-muted' : (
                  performance.absoluteGain >= 0 
                    ? 'text-success-strong' 
                    : 'text-danger'
                )
              }`}>
                {performance.noPriceData ? 'Non disponibile' : formatCurrency(performance.absoluteGain)}
              </p>
            </div>
            <div>
              <span className="block text-sm text-ink-secondary mb-1">Rendimento % (ROI)</span>
              <p className={`text-lg font-bold ${
                performance.noPriceData ? 'text-ink-muted' : (
                  performance.isPositive ? 'text-success-strong' : 'text-danger'
                )
              }`}>
                {performance.noPriceData ? 'Non disponibile' : (
                  `${performance.percentage > 0 ? '+' : ''}${performance.percentage.toFixed(2)}%`
                )}
              </p>
            </div>
          </div>

          {/* Terza riga: Dettagli investimento (solo se rilevante) */}
          {totalQuantity > 0 && currentMarketPrice > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-edge-subtle">
              <div>
                <span className="block text-sm text-ink-secondary mb-1">Prezzo Medio Acquisto</span>
                <p className="font-semibold text-ink">{formatCurrency(totalCost / totalQuantity)}</p>
              </div>              <div>
                <span className="block text-sm text-ink-secondary mb-1">Prezzo Attuale</span>
                <p className="font-semibold text-ink">
                  {performance.noPriceData ? (
                    <span className="text-ink-muted">Non disponibile</span>
                  ) : (
                    formatCurrency(currentMarketPrice)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Quarta riga: Quantità e allocazione (solo se rilevante) */}
          {totalQuantity > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-sm text-ink-secondary mb-1">Quantità Posseduta</span>
                <p className="font-semibold text-ink">
                  {totalQuantity % 1 === 0 ? totalQuantity.toFixed(0) : totalQuantity.toFixed(4)}
                  {asset.type === 'crypto' && ' unità'}
                  {asset.type === 'investment' && ' quote'}
                </p>
              </div>              <div>
                <span className="block text-sm text-ink-secondary mb-1">Valore per Unità</span>
                <p className="font-semibold text-ink">
                  {performance.noPriceData ? (
                    <span className="text-ink-muted">Non disponibile</span>
                  ) : (
                    formatCurrency(currentMarketPrice)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Quinta riga: Metriche avanzate (solo per investimenti) */}
          {asset.type === 'investment' && performanceData.length > 1 && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-edge-subtle">
              <div>
                <span className="block text-sm text-ink-secondary mb-1">Volatilità ({timeRange})</span>
                <p className="font-semibold text-ink">
                  {(() => {
                    const returns = performanceData.slice(1).map((point, i) => 
                      ((point.value - performanceData[i].value) / performanceData[i].value) * 100
                    )
                    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
                    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
                    const volatility = Math.sqrt(variance)
                    return `${volatility.toFixed(2)}%`
                  })()}
                </p>
              </div>
              <div>
                <span className="block text-sm text-ink-secondary mb-1">Max Drawdown</span>
                <p className="font-semibold text-danger">
                  {(() => {
                    let maxDrawdown = 0
                    let peak = performanceData[0]?.value || 0
                    
                    performanceData.forEach(point => {
                      if (point.value > peak) {
                        peak = point.value
                      } else {
                        const drawdown = ((peak - point.value) / peak) * 100
                        if (drawdown > maxDrawdown) {
                          maxDrawdown = drawdown
                        }
                      }
                    })
                    return `-${maxDrawdown.toFixed(2)}%`
                  })()}
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
