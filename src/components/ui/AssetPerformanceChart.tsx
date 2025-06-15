'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'

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
        console.log('� Using cached transactions data')        
        const data = JSON.parse(cached)
        setTransactions(data.transactions)
        setTotalCost(data.totalCost)
        setTotalQuantity(data.totalQuantity || 0)
        setLastUpdated(data.timestamp)
        return
      }
    }

    console.log('�🔍 Fetching transactions for asset:', asset.id, asset.name)
    try {
      const response = await fetch(`/api/transactions?asset_id=${asset.id}`)
      console.log('📡 API Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Transactions data:', data)
        setTransactions(data)        // Calcola totali: prima la quantità attuale, poi il costo medio
        let totalQuantity = 0
        let totalCostSpent = 0
        let totalQuantityBought = 0
        
        data.forEach((t: Transaction) => {
          console.log('Processing transaction:', t)
          
          if (t.transaction_type === 'buy') {
            // Acquisto: aggiungi alla quantità totale e al costo totale speso
            totalQuantity += t.quantity
            totalCostSpent += t.quantity * t.unit_price
            totalQuantityBought += t.quantity
          } else if (t.transaction_type === 'sell') {
            // Vendita: sottrai dalla quantità totale
            totalQuantity -= t.quantity
          }
        })
        
        // Il costo da considerare per il ROI è proporzionale alla quantità attuale
        const avgPurchasePrice = totalQuantityBought > 0 ? totalCostSpent / totalQuantityBought : 0
        const currentCost = totalQuantity * avgPurchasePrice
        
        console.log('💰 Calculated totals - Current Quantity:', totalQuantity, 'Avg Price:', avgPurchasePrice, 'Current Cost:', currentCost)
        setTotalQuantity(Math.max(0, totalQuantity))
        setTotalCost(Math.max(0, currentCost))
          // Salva in cache con timestamp
        const cacheData = {
          transactions: data,
          totalCost: Math.max(0, currentCost),
          totalQuantity: Math.max(0, totalQuantity),
          timestamp: new Date().toISOString()
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
        setLastUpdated(cacheData.timestamp)
      } else {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
      }
    } catch (error) {
      console.error('❌ Fetch error:', error)
    }
  }, [asset.id, asset.name, getCacheKey])
  // Funzione per recuperare il prezzo di mercato attuale con cache
  const fetchCurrentPrice = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey('price')
    
    // Controlla se ci sono dati in cache e non è un refresh forzato
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        console.log('� Using cached price data')
        const data = JSON.parse(cached)
        setCurrentMarketPrice(data.price)
        setLastUpdated(data.timestamp)
        return
      }
    }

    console.log('�💱 Fetching price for asset:', asset.name, 'Type:', asset.type, 'Symbol:', asset.symbol)
      if (asset.type === 'Buono Fruttifero') {
      console.log('🏦 Buono Fruttifero - no market price needed')
      setCurrentMarketPrice(0)
      return
    }

    // Verifica se l'asset ha un simbolo definito
    if (!asset.symbol) {
      console.warn(`⚠️ Asset ${asset.name} non ha un simbolo definito nel database`)
      setCurrentMarketPrice(0)
      return
    }

    try {
      const response = await fetch(`/api/market-price?symbol=${asset.symbol}&type=${asset.type}`)
      console.log('📈 Market price API status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('💰 Market price data:', data)
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
        console.warn(`⚠️ Impossibile recuperare il prezzo per ${asset.symbol}:`, errorData)
        setCurrentMarketPrice(0)
      }
    } catch (error) {
      console.error('❌ Market price fetch error:', error)
      setCurrentMarketPrice(0)
    }}, [asset.type, asset.symbol, asset.name, getCacheKey])
  // Funzione per refresh manuale dei dati
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    console.log('🔄 Manual refresh started for asset:', asset.name, 'Symbol:', asset.symbol)
    try {
      await Promise.all([
        fetchTransactions(true),
        fetchCurrentPrice(true)
      ])
      console.log('✅ Manual refresh completed')
    } catch (error) {
      console.error('❌ Error during manual refresh:', error)
    } finally {
      setRefreshing(false)
    }
  }, [fetchTransactions, fetchCurrentPrice, asset.name, asset.symbol])

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
          console.log('📦 Using cached portfolio data')
          const data = JSON.parse(cached)
          setPerformanceData(data.data)
          setLastUpdated(data.timestamp)
          setLoading(false)
          return
        }        console.log(`📊 Calculating portfolio performance for ${asset.name}`)
        
        // Verifica che l'asset abbia un simbolo definito
        if (!asset.symbol) {
          console.warn(`⚠️ Asset ${asset.name} non ha un simbolo definito per lo storico prezzi`)
          return
        }
        
        // Recupera lo storico prezzi dall'API
        const response = await fetch(`/api/price-history?symbol=${asset.symbol}&type=${asset.type}&days=${daysToFetch}`)
        
        if (response.ok) {
          const historyData = await response.json()
          console.log(`📈 Received ${historyData.length} price points for portfolio calculation`)
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
      console.warn(`⚠️ Prezzo di mercato non disponibile per ${asset.name} (symbol: ${asset.symbol})`)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {performance.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${performance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {performance.percentage > 0 ? '+' : ''}{performance.percentage.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-500">
              ({timeRange})
            </span>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
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
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
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
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : performanceData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500">
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
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={['dataMin - 100', 'dataMax + 100']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="text-sm text-gray-600">{label}</p>
                        <p className="text-sm font-semibold">
                          <span className={performance.isPositive ? 'text-green-600' : 'text-red-600'}>
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
                stroke={performance.isPositive ? "#10b981" : "#ef4444"}
                strokeWidth={3}
                dot={false}
                activeDot={{ 
                  r: 4, 
                  fill: performance.isPositive ? "#10b981" : "#ef4444",
                  strokeWidth: 2,
                  stroke: "#fff"
                }}
              />
              {/* Linea di riferimento per il break-even se necessario */}
              {totalCost > 0 && (
                <ReferenceLine 
                  y={totalCost} 
                  stroke="#6B7280" 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.5}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Date labels - ora gestite direttamente da Recharts */}
        </div>
      )}        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Avviso se non ci sono dati di prezzo */}
          {performance.noPriceData && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 text-amber-600">⚠️</div>
                <p className="text-sm text-amber-800">
                  <strong>Prezzo di mercato non disponibile</strong>
                </p>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                L'asset non ha un simbolo valido configurato ({asset.symbol || 'nessun simbolo'}) o il servizio di quotazioni non è raggiungibile. 
                Le metriche di performance sono temporaneamente non disponibili.
              </p>
            </div>
          )}

          {/* Prima riga: Valori fondamentali */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm text-gray-600 mb-1">Valore Attuale Portafoglio</span>
              <p className="text-lg font-bold text-gray-900">
                {performance.noPriceData ? (
                  <span className="text-gray-400">Non disponibile</span>
                ) : (
                  formatCurrency(performance.currentValue)
                )}
              </p>
            </div>
            <div>
              <span className="block text-sm text-gray-600 mb-1">Capitale Investito</span>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            </div>
          </div>

          {/* Seconda riga: Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-sm text-gray-600 mb-1">Guadagno/Perdita Assoluto</span>
              <p className={`text-lg font-bold ${
                performance.noPriceData ? 'text-gray-400' : (
                  performance.absoluteGain >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                )
              }`}>
                {performance.noPriceData ? 'Non disponibile' : formatCurrency(performance.absoluteGain)}
              </p>
            </div>
            <div>
              <span className="block text-sm text-gray-600 mb-1">Rendimento % (ROI)</span>
              <p className={`text-lg font-bold ${
                performance.noPriceData ? 'text-gray-400' : (
                  performance.isPositive ? 'text-green-600' : 'text-red-600'
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
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <span className="block text-sm text-gray-600 mb-1">Prezzo Medio Acquisto</span>
                <p className="font-semibold text-gray-900">{formatCurrency(totalCost / totalQuantity)}</p>
              </div>              <div>
                <span className="block text-sm text-gray-600 mb-1">Prezzo Attuale</span>
                <p className="font-semibold text-gray-900">
                  {performance.noPriceData ? (
                    <span className="text-gray-400">Non disponibile</span>
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
                <span className="block text-sm text-gray-600 mb-1">Quantità Posseduta</span>
                <p className="font-semibold text-gray-900">
                  {totalQuantity % 1 === 0 ? totalQuantity.toFixed(0) : totalQuantity.toFixed(4)}
                  {asset.type === 'crypto' && ' unità'}
                  {asset.type === 'investment' && ' quote'}
                </p>
              </div>              <div>
                <span className="block text-sm text-gray-600 mb-1">Valore per Unità</span>
                <p className="font-semibold text-gray-900">
                  {performance.noPriceData ? (
                    <span className="text-gray-400">Non disponibile</span>
                  ) : (
                    formatCurrency(currentMarketPrice)
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Quinta riga: Metriche avanzate (solo per investimenti) */}
          {asset.type === 'investment' && performanceData.length > 1 && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <span className="block text-sm text-gray-600 mb-1">Volatilità ({timeRange})</span>
                <p className="font-semibold text-gray-900">
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
                <span className="block text-sm text-gray-600 mb-1">Max Drawdown</span>
                <p className="font-semibold text-red-600">
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
