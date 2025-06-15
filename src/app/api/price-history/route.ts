import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const symbol = searchParams.get('symbol')
  const assetType = searchParams.get('type') || 'Stock'
  const days = parseInt(searchParams.get('days') || '30')

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  try {
    console.log(`📊 Fetching ${days} days of history for ${symbol} (${assetType})`)
    
    let historyData = null
    
    // 1. CRYPTO - usa CoinGecko per storico
    if (isCryptoSymbol(symbol)) {
      historyData = await getCryptoPriceHistory(symbol, days)
    }
    // 2. AZIONI/ETF - usa Yahoo Finance per storico  
    else if (isStockOrETF(symbol, assetType)) {
      historyData = await getStockPriceHistory(symbol, days)
    }
    // 3. FALLBACK - genera dati mock
    else {
      historyData = await generateMockHistory(symbol, days)
    }

    if (!historyData || historyData.length === 0) {
      return NextResponse.json({ error: 'History not found' }, { status: 404 })
    }

    return NextResponse.json(historyData)
  } catch (error) {
    console.error('Errore nel recupero dello storico:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Funzioni helper
function isCryptoSymbol(symbol: string): boolean {
  const cryptoSymbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'USDT', 'BNB', 'XRP', 'DOGE']
  return cryptoSymbols.includes(symbol.toUpperCase())
}

function isStockOrETF(symbol: string, assetType: string): boolean {
  return assetType.toLowerCase().includes('stock') || 
         assetType.toLowerCase().includes('etf') || 
         assetType.toLowerCase().includes('investment') ||
         symbol.includes('.')  // Simboli con exchange (es. IWDA.AS)
}

// Storico crypto da CoinGecko
async function getCryptoPriceHistory(symbol: string, days: number) {
  try {
    const cryptoId = getCoinGeckoId(symbol)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=eur&days=${days}&interval=daily`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 }
      }
    )
    
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`)
    
    const data = await response.json()
    const prices = data.prices || []
    
    return prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      price: price
    }))
  } catch (error) {
    console.error('Errore CoinGecko History:', error)
    return null
  }
}

function getCoinGeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'SOL': 'solana',
    'DOT': 'polkadot',
    'MATIC': 'polygon'
  }
  return mapping[symbol.toUpperCase()] || 'bitcoin'
}

// Storico azioni/ETF da Yahoo Finance
async function getStockPriceHistory(symbol: string, days: number) {
  try {
    const mappedSymbol = mapToYahooSymbol(symbol)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    console.log(`📈 Fetching Yahoo Finance history: ${mappedSymbol}`)
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${mappedSymbol}?interval=1d&period1=${Math.floor(startDate.getTime()/1000)}&period2=${Math.floor(endDate.getTime()/1000)}`,
      { 
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 }
      }
    )
    
    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`)
    
    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) return null
    
    const timestamps = result.timestamp || []
    const prices = result.indicators?.quote?.[0]?.close || []
    
    return timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      price: prices[index] || 0
    })).filter((item: {date: string, price: number}) => item.price > 0)
    
  } catch (error) {
    console.error('Errore Yahoo Finance History:', error)
    return null
  }
}

function mapToYahooSymbol(symbol: string): string {
  const mapping: Record<string, string> = {
    'IWDA': 'IWDA.AS',
    'MSCI_WORLD': 'IWDA.AS',
    'CORE_MSCI_WORLD_USD_ACC': 'IWDA.AS',
    'SP500': 'SPY',
    'NASDAQ': 'QQQ'
  }
  
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
  return mapping[cleanSymbol] || mapping[symbol.toUpperCase()] || symbol
}

// Dati mock per fallback
async function generateMockHistory(symbol: string, days: number) {
  const basePrice = 100 + Math.random() * 100
  const history = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    
    const volatility = 0.02
    const trend = Math.sin((i / days) * Math.PI) * 0.1
    const noise = (Math.random() - 0.5) * volatility
    const price = basePrice * (1 + trend + noise)
    
    history.push({
      date: date.toISOString().split('T')[0],
      price: Math.max(0.01, price)
    })
  }
  
  return history
}
