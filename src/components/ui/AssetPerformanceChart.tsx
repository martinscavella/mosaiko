'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface PerformanceDataPoint {
  date: string
  value: number
}

interface AssetPerformanceChartProps {
  assetId: string
  assetName: string
  currentValue: number
  purchasePrice: number
  purchaseDate: string
  className?: string
}

export default function AssetPerformanceChart({ 
  assetId, 
  assetName, 
  currentValue, 
  purchasePrice, 
  purchaseDate,
  className = '' 
}: AssetPerformanceChartProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M')
  const [loading, setLoading] = useState(false)

  // Genera dati di performance mock per dimostrazione
  useEffect(() => {
    const generateMockData = () => {
      const data: PerformanceDataPoint[] = []
      const startDate = new Date(purchaseDate)
      const endDate = new Date()
      const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calcola intervallo basato sul range selezionato
      let intervalDays = 1
      let dataPoints = 30
      
      switch (timeRange) {
        case '1M':
          intervalDays = 1
          dataPoints = 30
          break
        case '3M':
          intervalDays = 3
          dataPoints = 30
          break
        case '6M':
          intervalDays = 6
          dataPoints = 30
          break
        case '1Y':
          intervalDays = 12
          dataPoints = 30
          break
        case 'ALL':
          intervalDays = Math.max(1, Math.floor(daysDiff / 50))
          dataPoints = Math.min(50, daysDiff)
          break
      }

      // Genera trend realistico con volatilità
      const totalGrowth = (currentValue - purchasePrice) / purchasePrice
      const volatility = 0.05 // 5% di volatilità giornaliera
      
      for (let i = 0; i < dataPoints; i++) {
        const progressRatio = i / (dataPoints - 1)
        const baseValue = purchasePrice + (totalGrowth * purchasePrice * progressRatio)
        
        // Aggiungi un po' di rumore casuale
        const noise = (Math.random() - 0.5) * volatility * baseValue
        const value = Math.max(0, baseValue + noise)
        
        const date = new Date(startDate)
        date.setDate(date.getDate() + (i * intervalDays))
        
        data.push({
          date: date.toISOString().split('T')[0],
          value: value
        })
      }
      
      // Assicurati che l'ultimo punto sia il valore attuale
      if (data.length > 0) {
        data[data.length - 1].value = currentValue
      }
      
      return data
    }

    setLoading(true)
    // Simula un caricamento
    setTimeout(() => {
      setPerformanceData(generateMockData())
      setLoading(false)
    }, 500)
  }, [assetId, timeRange, currentValue, purchasePrice, purchaseDate])

  const calculatePerformance = () => {
    if (performanceData.length < 2) return { percentage: 0, isPositive: true }
    
    const firstValue = performanceData[0].value
    const lastValue = performanceData[performanceData.length - 1].value
    const percentage = ((lastValue - firstValue) / firstValue) * 100
    
    return { 
      percentage: percentage, 
      isPositive: percentage >= 0 
    }
  }

  const performance = calculatePerformance()

  // Calcola min e max per il grafico
  const values = performanceData.map(d => d.value)
  const minValue = Math.min(...values) * 0.95
  const maxValue = Math.max(...values) * 1.05
  const range = maxValue - minValue

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{assetName}</h3>
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
          </div>
        </div>
        
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
        </div>
      ) : (
        <div className="h-48 relative">
          <svg width="100%" height="100%" className="overflow-visible">
            {/* Griglia orizzontale */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={`${ratio * 100}%`}
                  x2="100%"
                  y2={`${ratio * 100}%`}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                />
                <text
                  x="100%"
                  y={`${ratio * 100}%`}
                  dy="0.3em"
                  textAnchor="end"
                  className="text-xs fill-gray-400"
                  dx="-4"
                >
                  {formatCurrency(maxValue - (ratio * range))}
                </text>
              </g>
            ))}
            
            {/* Linea del grafico */}
            <polyline
              fill="none"
              stroke={performance.isPositive ? "#10b981" : "#ef4444"}
              strokeWidth="2"
              points={performanceData.map((point, index) => {
                const x = (index / (performanceData.length - 1)) * 100
                const y = ((maxValue - point.value) / range) * 100
                return `${x},${y}`
              }).join(' ')}
            />
            
            {/* Punti sul grafico */}
            {performanceData.map((point, index) => {
              const x = (index / (performanceData.length - 1)) * 100
              const y = ((maxValue - point.value) / range) * 100
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="3"
                  fill={performance.isPositive ? "#10b981" : "#ef4444"}
                  className="opacity-0 hover:opacity-100 transition-opacity"
                >
                  <title>
                    {new Date(point.date).toLocaleDateString('it-IT')} - {formatCurrency(point.value)}
                  </title>
                </circle>
              )
            })}
          </svg>
          
          {/* Date labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{new Date(performanceData[0]?.date).toLocaleDateString('it-IT')}</span>
            <span>{new Date(performanceData[performanceData.length - 1]?.date).toLocaleDateString('it-IT')}</span>
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Valore Attuale</span>
            <p className="font-semibold">{formatCurrency(currentValue)}</p>
          </div>
          <div>
            <span className="text-gray-600">Prezzo di Acquisto</span>
            <p className="font-semibold">{formatCurrency(purchasePrice)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
